// src/app/(protected)/api/webhook/instagram/route.ts
import {
  createChatHistory,
  getChatHistory,
  getKeywordAutomation,
  matchKeyword,
  trackResponses,
} from '@/actions/webhook/queries';
import { sendDM, sendCommentReply } from '@/lib/fetch';
import { openai } from '@/lib/openai';
import { client } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

// Webhook verification endpoint
export async function GET(req: NextRequest) {
  const hub = req.nextUrl.searchParams.get('hub.challenge');
  return new NextResponse(hub);
}

// Simple fallback for when no custom response is set
function generateSmartFallback(messageText: string): string {
  return "Thanks for your message! How can I assist you today?";
}

// Validate token with Instagram API (for safety)
async function validateToken(token: string, accountId: string): Promise<boolean> {
  try {
    const response = await axios.get(`https://graph.instagram.com/me?fields=id&access_token=${token}`);
    console.log("✅ Token test response:", JSON.stringify(response.data));
    if (response.data.id === accountId) {
      console.log("✅ Token matches account ID:", accountId);
      return true;
    } else {
      console.log("❌ Token valid but ID mismatch. Expected:", accountId, "Got:", response.data.id);
      return false;
    }
  } catch (error: any) {
    console.error("❌ Token validation failed:", error.response?.data?.error?.message || error.message);
    return false;
  }
}

// Main webhook handler
export async function POST(req: NextRequest) {
  try {
    const webhook_payload = await req.json();
    console.log("=== WEBHOOK DEBUG START ===");
    console.log("Full Webhook Payload:", JSON.stringify(webhook_payload, null, 2));

    const entry = webhook_payload.entry?.[0];
    if (!entry) {
      console.log("❌ No entry in webhook payload");
      return NextResponse.json({ message: 'No entry found' }, { status: 200 });
    }

    console.log("Entry ID:", entry.id);

    // Handle comments
    if (entry.changes && entry.changes[0].field === 'comments') {
      const commentData = entry.changes[0].value;
      const commentText = commentData.text.toLowerCase();
      const commentId = commentData.id;
      const postId = commentData.media.id;
      const commenterId = commentData.from.id;

      console.log("📝 Processing comment:", commentText);

      let automation = await client.automation.findFirst({
        where: {
          posts: {
            some: { postid: postId },
          },
        },
        include: {
          listener: true,
          User: {
            select: {
              subscription: { select: { plan: true } },
              integrations: { select: { token: true } },
            },
          },
        },
      });

      if (!automation) {
        console.log("⚠️ No automation for post ID, creating new...");
        const integration = await client.integrations.findFirst({
          where: { instagramId: entry.id },
          select: { userId: true, token: true },
        });
        if (!integration || !integration.userId) {
          console.log("❌ No integration found for account ID:", entry.id);
          return NextResponse.json({ message: 'No integration found' }, { status: 200 });
        }
        automation = await client.automation.create({
          data: {
            userId: integration.userId,
            listener: {
              create: {
                prompt: "You are a helpful assistant.",
                commentReply: "Thanks for your comment!",
                listener: "MESSAGE",
              },
            },
          },
          include: {
            listener: true,
            User: {
              select: {
                subscription: { select: { plan: true } },
                integrations: { select: { token: true } },
              },
            },
          },
        });
      }

      console.log("🔍 Automation found:", automation.id, "Plan:", automation.User?.subscription?.plan);

      const token = automation.User?.integrations?.[0]?.token;
      if (!token) {
        console.log("❌ No valid integration token found");
        return NextResponse.json({ message: 'No valid integration token' }, { status: 200 });
      }

      const isTokenValid = await validateToken(token, entry.id);
      if (!isTokenValid) {
        console.log("❌ Token invalid - please refresh Instagram access token");
        return NextResponse.json({ message: 'Invalid token' }, { status: 401 });
      }

      if (automation.listener?.commentReply) {
        try {
          console.log("📤 Sending comment reply:", automation.listener.commentReply);
          const replyResponse = await sendCommentReply(commentId, automation.listener.commentReply, token);
          console.log("✅ Comment reply sent successfully:", replyResponse);
          await trackResponses(automation.id, 'COMMENT');
        } catch (error: unknown) {
          console.error("❌ Error sending comment reply:", error);
        }
      }

      const plan = automation.User?.subscription?.plan || 'FREE';
      if (plan === 'PRO') {
        try {
          console.log("🤖 Generating AI-powered DM for PRO user");
          const { history } = await getChatHistory(commenterId, entry.id);
          const limitedHistory = history.slice(-5);
          limitedHistory.push({ role: 'user', content: commentText });

          const aiPrompt = automation.listener?.prompt || "You are a helpful assistant.";
          const smart_ai_message = await openai.chat.completions.create({
            model: 'google/gemma-3-27b-it:free',
            messages: [{ role: 'system', content: aiPrompt }, ...limitedHistory],
          });

          const aiResponse = smart_ai_message?.choices?.[0]?.message?.content || generateSmartFallback(commentText);
          console.log("📤 Sending AI response as DM:", aiResponse);
          const dmResponse = await sendDM(entry.id, commenterId, aiResponse, token);
          console.log("✅ DM sent successfully:", dmResponse);
          await createChatHistory(automation.id, commenterId, entry.id, commentText);
          await createChatHistory(automation.id, entry.id, commenterId, aiResponse);
          await trackResponses(automation.id, 'DM');
        } catch (error) {
          console.error("❌ Error sending AI-powered DM:", error);
          const fallbackResponse = generateSmartFallback(commentText);
          console.log("📤 Sending smart fallback DM:", fallbackResponse);
          const dmResponse = await sendDM(entry.id, commenterId, fallbackResponse, token);
          console.log("✅ Fallback DM sent successfully:", dmResponse);
          await createChatHistory(automation.id, commenterId, entry.id, commentText);
          await createChatHistory(automation.id, entry.id, commenterId, fallbackResponse);
          await trackResponses(automation.id, 'DM');
        }
      } else {
        try {
          const templateMessage = `Thanks for your comment: "${commentText}"! How can we assist you today?`;
          console.log("📤 Sending template DM for non-PRO user:", templateMessage);
          const dmResponse = await sendDM(entry.id, commenterId, templateMessage, token);
          console.log("✅ DM sent successfully:", dmResponse);
          await trackResponses(automation.id, 'DM');
        } catch (error: unknown) {
          console.error("❌ Error sending template DM:", error);
        }
      }

      console.log("✅ Comment processing completed");
      return NextResponse.json({ message: 'Comment processed' }, { status: 200 });
    }

    // Handle messages
    const messaging = entry.messaging?.[0];
    console.log("Messaging Object:", JSON.stringify(messaging, null, 2));

    if (messaging?.read || messaging?.message?.is_echo) {
      console.log("Skipping read receipt or echo message");
      return NextResponse.json({ message: 'Receipt processed' }, { status: 200 });
    }

    if (messaging?.message?.text) {
      const messageText = messaging.message.text;
      console.log("📝 Processing message:", messageText);

      const userId = messaging.sender.id;
      const accountId = entry.id;

      const { history, automationId } = await getChatHistory(userId, accountId);
      const isOngoing = history.length > 0;
      console.log("🔄 Ongoing conversation check:", isOngoing, "History length:", history.length, "Automation ID from history:", automationId);

      let automation;
      if (isOngoing && automationId) {
        automation = await getKeywordAutomation(automationId, true);
        console.log("🤖 Continuing with ongoing automation:", automation?.id);
      } else {
        const matcher = await matchKeyword(messageText);
        console.log("🔍 Keyword match result:", matcher);
        if (matcher?.automationId) {
          automation = await getKeywordAutomation(matcher.automationId, true);
          console.log("🤖 Starting automation via keyword:", automation?.id);
        }
      }

      if (!automation) {
        console.log("⚠️ No automation found, creating new...");
        const integration = await client.integrations.findFirst({
          where: { instagramId: accountId },
          select: { userId: true, token: true },
        });
        if (!integration || !integration.userId) {
          console.log("❌ No integration found for account ID:", accountId);
          return NextResponse.json({ message: 'No integration found' }, { status: 200 });
        }
        automation = await client.automation.create({
          data: {
            userId: integration.userId,
            listener: {
              create: {
                prompt: "You are a helpful assistant.",
                commentReply: "ok",
                listener: "MESSAGE",
              },
            },
          },
          include: {
            listener: true,
            User: {
              select: {
                subscription: { select: { plan: true } },
                integrations: { select: { token: true } },
              },
            },
          },
        });
        console.log("✅ Created new automation:", automation.id);
      }

      console.log("🔍 Automation found:", automation.id, "Plan:", automation.User?.subscription?.plan);

      const token = automation.User?.integrations?.[0]?.token;
      if (!token) {
        console.log("❌ No valid integration token found");
        return NextResponse.json({ message: 'No valid integration token' }, { status: 200 });
      }

      const isTokenValid = await validateToken(token, accountId);
      if (!isTokenValid) {
        console.log("❌ Token invalid - please refresh Instagram access token");
        return NextResponse.json({ message: 'Invalid token' }, { status: 401 });
      }

      const plan = automation.User?.subscription?.plan || 'FREE';
      if (plan === 'PRO') {
        try {
          console.log("🤖 Generating AI-powered response for PRO user");
          const limitedHistory = history.slice(-5);
          limitedHistory.push({ role: 'user', content: messageText });

          const aiPrompt = automation.listener?.prompt || "You are a helpful assistant.";
          const smart_ai_message = await openai.chat.completions.create({
            model: 'google/gemma-3-27b-it:free',
            messages: [{ role: 'system', content: aiPrompt }, ...limitedHistory],
          });

          const aiResponse = smart_ai_message?.choices?.[0]?.message?.content || generateSmartFallback(messageText);
          console.log("📤 Sending AI response as DM:", aiResponse);
          const dmResponse = await sendDM(accountId, userId, aiResponse, token);
          console.log("✅ DM sent successfully:", dmResponse);
          await createChatHistory(automation.id, userId, accountId, messageText);
          await createChatHistory(automation.id, accountId, userId, aiResponse);
          await trackResponses(automation.id, 'DM');
          return NextResponse.json({ message: 'AI response sent' }, { status: 200 });
        } catch (error) {
          console.error("❌ Error sending AI-powered DM:", error);
          const fallbackResponse = generateSmartFallback(messageText);
          console.log("📤 Sending smart fallback DM:", fallbackResponse);
          const dmResponse = await sendDM(accountId, userId, fallbackResponse, token);
          console.log("✅ Fallback DM sent successfully:", dmResponse);
          await createChatHistory(automation.id, userId, accountId, messageText);
          await createChatHistory(automation.id, accountId, userId, fallbackResponse);
          await trackResponses(automation.id, 'DM');
          return NextResponse.json({ message: 'Fallback response sent' }, { status: 200 });
        }
      } else {
        try {
          const messageResponse = isOngoing
            ? generateSmartFallback(messageText)
            : "Hello! How can we assist you today?";
          console.log("📤 Sending DM for non-PRO user:", messageResponse);
          const dmResponse = await sendDM(accountId, userId, messageResponse, token);
          console.log("✅ DM sent successfully:", dmResponse);
          await createChatHistory(automation.id, userId, accountId, messageText);
          await createChatHistory(automation.id, accountId, userId, messageResponse);
          await trackResponses(automation.id, 'DM');
          return NextResponse.json({ message: 'Message sent' }, { status: 200 });
        } catch (error) {
          console.error("❌ Error sending DM:", error);
          return NextResponse.json({ message: 'Error sending message' }, { status: 500 });
        }
      }
    }

    console.log("=== WEBHOOK DEBUG END ===");
    return NextResponse.json({ message: 'No automation set' }, { status: 200 });
  } catch (error) {
    console.error("❌ Webhook Error:", error);
    return NextResponse.json({ message: 'Error processing webhook' }, { status: 500 });
  }
}