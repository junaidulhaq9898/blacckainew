// src/app/(protected)/api/webhook/instagram/route.ts
import { findAutomation } from '@/actions/automations/queries';
import {
  createChatHistory,
  getChatHistory,
  getKeywordAutomation,
  hasRecentMessages,
  matchKeyword,
  trackResponses,
} from '@/actions/webhook/queries';
import { sendDM, sendCommentReply } from '@/lib/fetch';
import { openai } from '@/lib/openai';
import { client } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

// Webhook verification endpoint
export async function GET(req: NextRequest) {
  const hub = req.nextUrl.searchParams.get('hub.challenge');
  return new NextResponse(hub);
}

// Dynamic fallback using only the prompt
function generateSmartFallback(messageText: string, prompt?: string): string {
  console.log("🔍 [Fallback] Message:", messageText, "Prompt:", prompt || 'None');
  const lowerText = messageText.toLowerCase();

  if (!prompt || !prompt.trim()) {
    console.log("⚠️ [Fallback] No prompt provided, using default");
    return "Hello! How can I assist you today?";
  }

  const promptSentences = prompt.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 0);
  const keywords = lowerText.split(/\s+/).filter(word => word.length > 2);
  console.log("🔍 [Fallback] Keywords:", keywords, "Prompt sentences:", promptSentences);

  for (const keyword of keywords) {
    for (const sentence of promptSentences) {
      if (sentence.toLowerCase().includes(keyword)) {
        console.log("✅ [Fallback] Matched:", sentence);
        return `${sentence}. How can I assist you further?`;
      }
    }
  }

  console.log("⚠️ [Fallback] No keyword match, returning full prompt");
  return `${prompt}. How can I assist you further?`;
}

// Main webhook handler
export async function POST(req: NextRequest) {
  try {
    const webhook_payload = await req.json();
    console.log("=== WEBHOOK DEBUG START ===");
    console.log("Full Webhook Payload:", JSON.stringify(webhook_payload, null, 2));
    console.log("🔍 Code version: 2025-04-07-v4");

    const entry = webhook_payload.entry?.[0];
    if (!entry) {
      console.log("❌ No entry in webhook payload");
      return NextResponse.json({ message: 'No entry found' }, { status: 200 });
    }

    console.log("🔍 Instagram Account ID (entry.id):", entry.id);

    // Handle comments
    if (entry.changes && entry.changes[0].field === 'comments') {
      console.log("🔍 Processing comment payload");
      const commentData = entry.changes[0].value;
      const commentText = commentData.text.toLowerCase();
      const commentId = commentData.id;
      const postId = commentData.media.id;
      const commenterId = commentData.from.id;

      console.log("📝 Processing comment:", commentText, "Post ID:", postId);

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
              integrations: { select: { token: true, instagramId: true } },
            },
          },
        },
      });

      if (!automation) {
        console.log("⚠️ No automation for post ID, trying account ID:", entry.id);
        automation = await client.automation.findFirst({
          where: {
            User: {
              integrations: {
                some: { instagramId: entry.id },
              },
            },
          },
          include: {
            listener: true,
            User: {
              select: {
                subscription: { select: { plan: true } },
                integrations: { select: { token: true, instagramId: true } },
              },
            },
          },
        });
      }

      if (!automation) {
        console.log("❌ No automation found for account ID:", entry.id);
        return NextResponse.json({ message: 'No automation found' }, { status: 200 });
      }

      console.log("🔍 Automation ID:", automation.id, "Plan:", automation.User?.subscription?.plan);
      console.log("🔍 Listener config:", JSON.stringify(automation.listener));
      console.log("🔍 Token available:", !!automation.User?.integrations?.[0]?.token);

      const token = automation.User?.integrations?.[0]?.token;
      if (!token) {
        console.log("❌ No valid token for automation:", automation.id);
        return NextResponse.json({ message: 'No valid token' }, { status: 200 });
      }

      if (automation.listener?.commentReply) {
        console.log("📤 Sending comment reply:", automation.listener.commentReply);
        try {
          const replyResponse = await sendCommentReply(commentId, automation.listener.commentReply, token);
          console.log("✅ Comment reply sent:", replyResponse);
          await trackResponses(automation.id, 'COMMENT');
        } catch (error) {
          console.error("❌ Error sending comment reply:", error);
        }
      } else {
        console.log("⚠️ No comment reply set");
      }

      const { history } = await getChatHistory(commenterId, entry.id);
      console.log("🔍 Comment history length:", history.length);

      if (automation.User?.subscription?.plan === 'PRO') {
        console.log("🤖 Starting PRO comment processing");
        try {
          const limitedHistory = history.slice(-5);
          limitedHistory.push({ role: 'user', content: commentText });

          const aiPrompt = automation.listener?.listener === 'SMARTAI' && automation.listener?.prompt
            ? automation.listener.prompt
            : "You are a customer service assistant. Answer concisely in 1-2 sentences.";
          console.log("🔍 AI Prompt:", aiPrompt);

          const smart_ai_message = await openai.chat.completions.create({
            model: 'google/gemma-3-27b-it:free',
            messages: [
              { role: 'system', content: aiPrompt },
              ...limitedHistory,
            ],
          });

          const aiResponse = smart_ai_message?.choices?.[0]?.message?.content;
          if (aiResponse) {
            console.log("📤 Sending AI DM:", aiResponse);
            const dmResponse = await sendDM(entry.id, commenterId, aiResponse, token);
            console.log("✅ DM sent:", dmResponse);
            await createChatHistory(automation.id, commenterId, entry.id, commentText);
            await createChatHistory(automation.id, entry.id, commenterId, aiResponse);
            console.log("✅ Chat history updated with ID:", automation.id);
            await trackResponses(automation.id, 'DM');
          } else {
            console.log("⚠️ AI returned no response, using fallback");
            const fallbackResponse = generateSmartFallback(commentText, automation.listener?.prompt);
            console.log("📤 Sending fallback DM:", fallbackResponse);
            const dmResponse = await sendDM(entry.id, commenterId, fallbackResponse, token);
            console.log("✅ Fallback DM sent:", dmResponse);
            await createChatHistory(automation.id, commenterId, entry.id, commentText);
            await createChatHistory(automation.id, entry.id, commenterId, fallbackResponse);
            await trackResponses(automation.id, 'DM');
          }
        } catch (error) {
          console.error("❌ Error in PRO AI block:", error);
          const fallbackResponse = generateSmartFallback(commentText, automation.listener?.prompt);
          console.log("📤 Sending fallback DM:", fallbackResponse);
          const dmResponse = await sendDM(entry.id, commenterId, fallbackResponse, token);
          console.log("✅ Fallback DM sent:", dmResponse);
          await createChatHistory(automation.id, commenterId, entry.id, commentText);
          await createChatHistory(automation.id, entry.id, commenterId, fallbackResponse);
          await trackResponses(automation.id, 'DM');
        }
      } else { // Removed history.length === 0 condition for free plan comments
        console.log("🔍 Free plan comment detected");
        const freeResponse = automation.listener?.prompt
          ? generateSmartFallback(commentText, automation.listener.prompt)
          : "Hello! How can we assist you today?";
        console.log("📤 Sending free plan DM:", freeResponse);
        try {
          const dmResponse = await sendDM(entry.id, commenterId, freeResponse, token);
          console.log("✅ Free plan DM sent:", dmResponse);
          await createChatHistory(automation.id, commenterId, entry.id, commentText);
          await createChatHistory(automation.id, entry.id, commenterId, freeResponse);
          console.log("✅ Chat history updated with ID:", automation.id);
          await trackResponses(automation.id, 'DM');
        } catch (error) {
          console.error("❌ Error sending free plan DM:", error);
        }
      }

      console.log("✅ Comment processing completed");
      return NextResponse.json({ message: 'Comment processed' }, { status: 200 });
    }

    // Handle messages
    const messaging = entry.messaging?.[0];
    console.log("Messaging Object:", JSON.stringify(messaging, null, 2));
    console.log("🔍 Checking PRO payload reach"); // Added log

    if (messaging?.read || messaging?.message?.is_echo) {
      console.log("Skipping read receipt or echo message");
      return NextResponse.json({ message: 'Receipt processed' }, { status: 200 });
    }

    if (messaging?.message?.text) {
      console.log("🔍 Processing message payload");
      const messageText = messaging.message.text;
      console.log("📝 Processing message:", messageText);

      const userId = messaging.sender.id;
      const accountId = entry.id;

      const { history, automationId } = await getChatHistory(userId, accountId);
      const isOngoing = history.length > 0;
      console.log("🔄 Ongoing conversation:", isOngoing, "History length:", history.length, "Automation ID:", automationId);

      let automation;
      if (isOngoing && automationId) {
        automation = await getKeywordAutomation(automationId, true);
        console.log("🤖 Continuing automation:", automation?.id);
      } else {
        const matcher = await matchKeyword(messageText);
        console.log("🔍 Keyword match:", matcher);
        if (matcher?.automationId) {
          automation = await getKeywordAutomation(matcher.automationId, true);
          console.log("🤖 Starting automation via keyword:", automation?.id);
        } else {
          automation = await client.automation.findFirst({
            where: {
              User: {
                integrations: {
                  some: { instagramId: accountId },
                },
              },
            },
            include: {
              User: { select: { subscription: { select: { plan: true } }, integrations: { select: { token: true, instagramId: true } } } },
              listener: true,
            },
            orderBy: { createdAt: 'desc' },
          });
          console.log("🤖 Recovered automation by account ID:", automation?.id || 'none');
        }
      }

      if (!automation) {
        console.log("❌ No automation found for account ID:", accountId);
        return NextResponse.json({ message: 'No automation found' }, { status: 200 });
      }

      console.log("🔍 Automation ID:", automation.id, "Plan:", automation.User?.subscription?.plan);
      console.log("🔍 Listener config:", JSON.stringify(automation.listener));
      console.log("🔍 Token available:", !!automation.User?.integrations?.[0]?.token);

      const token = automation.User?.integrations?.[0]?.token;
      if (!token) {
        console.log("❌ No valid token for automation:", automation.id);
        return NextResponse.json({ message: 'No valid token' }, { status: 200 });
      }

      if (automation.User?.subscription?.plan === 'PRO') {
        console.log("🤖 Starting PRO message processing");
        try {
          const limitedHistory = history.slice(-5);
          limitedHistory.push({ role: 'user', content: messageText });

          const aiPrompt = automation.listener?.listener === 'SMARTAI' && automation.listener?.prompt
            ? automation.listener.prompt
            : "You are a customer service assistant. Answer concisely in 1-2 sentences.";
          console.log("🔍 AI Prompt:", aiPrompt);

          const smart_ai_message = await openai.chat.completions.create({
            model: 'google/gemma-3-27b-it:free',
            messages: [
              { role: 'system', content: aiPrompt },
              ...limitedHistory,
            ],
          });

          const aiResponse = smart_ai_message?.choices?.[0]?.message?.content;
          if (aiResponse) {
            console.log("📤 Sending AI DM:", aiResponse);
            const direct_message = await sendDM(accountId, userId, aiResponse, token);
            console.log("✅ DM sent:", direct_message);
            await createChatHistory(automation.id, userId, accountId, messageText);
            await createChatHistory(automation.id, accountId, userId, aiResponse);
            console.log("✅ Chat history updated with ID:", automation.id);
            await trackResponses(automation.id, 'DM');
            return NextResponse.json({ message: 'AI response sent' }, { status: 200 });
          } else {
            console.log("⚠️ AI returned no response, using fallback");
            const fallbackResponse = generateSmartFallback(messageText, automation.listener?.prompt);
            console.log("📤 Sending fallback DM:", fallbackResponse);
            const direct_message = await sendDM(accountId, userId, fallbackResponse, token);
            console.log("✅ Fallback DM sent:", direct_message);
            await createChatHistory(automation.id, userId, accountId, messageText);
            await createChatHistory(automation.id, accountId, userId, fallbackResponse);
            await trackResponses(automation.id, 'DM');
            return NextResponse.json({ message: 'Fallback response sent' }, { status: 200 });
          }
        } catch (error) {
          console.error("❌ Error in PRO AI block:", error);
          const fallbackResponse = generateSmartFallback(messageText, automation.listener?.prompt);
          console.log("📤 Sending fallback DM:", fallbackResponse);
          const direct_message = await sendDM(accountId, userId, fallbackResponse, token);
          console.log("✅ Fallback DM sent:", direct_message);
          await createChatHistory(automation.id, userId, accountId, messageText);
          await createChatHistory(automation.id, accountId, userId, fallbackResponse);
          await trackResponses(automation.id, 'DM');
          return NextResponse.json({ message: 'Fallback response sent' }, { status: 200 });
        }
      } else { // Removed history.length === 0 condition for free plan messages
        console.log("🔍 Free plan message detected");
        const freeResponse = automation.listener?.prompt
          ? generateSmartFallback(messageText, automation.listener.prompt)
          : "Hello! How can we assist you today?";
        console.log("📤 Sending free plan DM:", freeResponse);
        try {
          const direct_message = await sendDM(accountId, userId, freeResponse, token);
          console.log("✅ Free plan DM sent:", direct_message);
          await createChatHistory(automation.id, userId, accountId, messageText);
          await createChatHistory(automation.id, accountId, userId, freeResponse);
          console.log("✅ Chat history updated with ID:", automation.id);
          await trackResponses(automation.id, 'DM');
          return NextResponse.json({ message: 'Free plan DM sent' }, { status: 200 });
        } catch (error) {
          console.error("❌ Error sending free plan DM:", error);
          return NextResponse.json({ message: 'Error sending free plan DM' }, { status: 500 });
        }
      }
    }

    console.log("🔍 No actionable payload detected");
    console.log("=== WEBHOOK DEBUG END ===");
    return NextResponse.json({ message: 'No automation set' }, { status: 200 });
  } catch (error) {
    console.error("❌ Webhook Error:", error);
    return NextResponse.json({ message: 'Error processing webhook' }, { status: 500 });
  }
}