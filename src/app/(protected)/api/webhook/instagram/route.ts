// src/app/(protected)/api/webhook/instagram/route.ts
import { findAutomation } from '@/actions/automations/queries';
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

interface Integration {
  token: string;
  instagramId: string | null;
}

export async function GET(req: NextRequest) {
  const hub = req.nextUrl.searchParams.get('hub.challenge');
  return new NextResponse(hub);
}

function generateSmartFallback(messageText: string, prompt?: string): string {
  const basePrompt = prompt || "I’m here to assist with your business needs.";
  return `${basePrompt} How can I help with: "${messageText}"?`;
}

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

    if (entry.changes && entry.changes[0].field === 'comments') {
      const commentData = entry.changes[0].value;
      const commentText = commentData.text.toLowerCase();
      const commentId = commentData.id;
      const postId = commentData.media.id;
      const commenterId = commentData.from.id;

      console.log("📝 Processing comment:", commentText);

      const automation = await client.automation.findFirst({
        where: {
          posts: { some: { postid: postId } },
          User: { integrations: { some: { token: { not: undefined } } } },
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
        console.log("❌ No automation found for post ID:", postId);
        return NextResponse.json({ message: 'No automation found' }, { status: 200 });
      }

      console.log("🔍 Automation found:", automation.id, "Plan:", automation.User?.subscription?.plan);
      console.log("🔍 Listener Prompt:", automation.listener?.prompt);

      const token = automation.User?.integrations[0]?.token;
      if (!token) {
        console.log("❌ No valid integration token found");
        return NextResponse.json({ message: 'No valid integration token' }, { status: 200 });
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

      if (automation.User?.subscription?.plan === 'PRO') {
        try {
          console.log("🤖 Generating AI-powered DM for PRO user");
          const { history } = await getChatHistory(commenterId, entry.id);
          const limitedHistory = history.slice(-5);
          limitedHistory.push({ role: 'user', content: commentText });

          const aiPrompt = automation.listener?.prompt
            ? `You are an assistant for a specific business. ${automation.listener.prompt} Respond only about the business and do not mention being an AI, model, or anything unrelated to the business.`
            : "You are a customer service assistant for a business. Respond only about the business and do not mention being an AI or model.";
          console.log("🤖 AI Prompt Used:", aiPrompt);

          const smart_ai_message = await openai.chat.completions.create({
            model: 'google/gemma-3-27b-it:free',
            messages: [
              { role: 'system', content: aiPrompt },
              ...limitedHistory,
            ],
            max_tokens: 100,
          });

          if (smart_ai_message?.choices?.[0]?.message?.content) {
            const aiResponse = smart_ai_message.choices[0].message.content;
            console.log("📤 Sending AI response as DM:", aiResponse);
            const dmResponse = await sendDM(entry.id, commenterId, aiResponse, token);
            console.log("✅ DM sent successfully:", dmResponse);
            await createChatHistory(automation.id, commenterId, entry.id, commentText);
            await createChatHistory(automation.id, entry.id, commenterId, aiResponse);
            await trackResponses(automation.id, 'DM');
          } else {
            console.error("❌ No content in AI response:", smart_ai_message);
            const fallbackResponse = generateSmartFallback(commentText, automation.listener?.prompt);
            console.log("📤 Sending smart fallback DM:", fallbackResponse);
            const dmResponse = await sendDM(entry.id, commenterId, fallbackResponse, token);
            console.log("✅ Fallback DM sent successfully:", dmResponse);
            await createChatHistory(automation.id, commenterId, entry.id, commentText);
            await createChatHistory(automation.id, entry.id, commenterId, fallbackResponse);
            await trackResponses(automation.id, 'DM');
          }
        } catch (error) {
          console.error("❌ Error in AI-powered block:", error);
          const fallbackResponse = generateSmartFallback(commentText, automation.listener?.prompt);
          console.log("📤 Sending smart fallback DM:", fallbackResponse);
          const dmResponse = await sendDM(entry.id, commenterId, fallbackResponse, token);
          console.log("✅ Fallback DM sent successfully:", dmResponse);
          await createChatHistory(automation.id, commenterId, entry.id, commentText);
          await createChatHistory(automation.id, entry.id, commenterId, fallbackResponse);
          await trackResponses(automation.id, 'DM');
        }
      } else {
        try {
          const templateMessage = automation.listener?.prompt || "Hello! How can we assist you today?";
          console.log("📤 Sending template DM for non-PRO user:", templateMessage);
          const dmResponse = await sendDM(entry.id, commenterId, templateMessage, token);
          console.log("✅ DM sent successfully:", dmResponse);
          await createChatHistory(automation.id, commenterId, entry.id, commentText);
          await createChatHistory(automation.id, entry.id, commenterId, templateMessage);
          await trackResponses(automation.id, 'DM');
        } catch (error) {
          console.error("❌ Error sending template DM for non-PRO user:", error);
        }
      }

      console.log("✅ Comment processing completed");
      return NextResponse.json({ message: 'Comment processed' }, { status: 200 });
    }

    const messaging = entry.messaging?.[0];
    console.log("Messaging Object:", JSON.stringify(messaging, null, 2));

    if (messaging?.read || messaging?.message?.is_echo) {
      console.log("Skipping read receipt or echo message");
      return NextResponse.json({ message: 'Receipt processed' }, { status: 200 });
    }

    if (messaging?.message?.text) {
      const messageText = messaging.message.text;
      const userId = messaging.sender.id;
      const accountId = messaging.recipient.id;

      console.log("📝 Processing message:", messageText);
      console.log("Sender ID (userId):", userId, "Recipient ID (accountId):", accountId);

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
        } else {
          automation = await client.automation.findFirst({
            where: {
              User: {
                integrations: {
                  some: {
                    token: { not: undefined },
                    instagramId: accountId,
                  },
                },
              },
            },
            include: {
              User: {
                select: {
                  subscription: { select: { plan: true } },
                  integrations: { select: { token: true, instagramId: true } },
                },
              },
              listener: true,
            },
            orderBy: { createdAt: 'desc' },
          });
          if (automation) {
            console.log("🤖 Started automation for new user:", automation.id);
          } else {
            console.log("❌ No automation found for account:", accountId);
            return NextResponse.json({ message: 'No automation found' }, { status: 200 });
          }
        }
      }

      if (!automation) {
        console.log("❌ Automation fetch failed");
        return NextResponse.json({ message: 'Automation fetch failed' }, { status: 200 });
      }

      console.log("🔍 Automation plan:", automation.User?.subscription?.plan);
      console.log("🔍 Listener Prompt:", automation.listener?.prompt);

      const token = automation.User?.integrations.find((i: Integration) => i.instagramId === accountId)?.token || automation.User?.integrations[0]?.token;
      if (!token) {
        console.log("❌ No valid integration token found");
        return NextResponse.json({ message: 'No valid integration token' }, { status: 200 });
      }

      if (automation.User?.subscription?.plan === 'PRO') {
        try {
          console.log("🤖 Generating AI-powered response for PRO user");
          const limitedHistory = history.slice(-5);
          limitedHistory.push({ role: 'user', content: messageText });

          const aiPrompt = automation.listener?.prompt
            ? `You are an assistant for a specific business. ${automation.listener.prompt} Respond only about the business and do not mention being an AI, model, or anything unrelated to the business.`
            : "You are a customer service assistant for a business. Respond only about the business and do not mention being an AI or model.";
          console.log("🤖 AI Prompt Used:", aiPrompt);

          const smart_ai_message = await openai.chat.completions.create({
            model: 'google/gemma-3-27b-it:free',
            messages: [
              { role: 'system', content: aiPrompt },
              ...limitedHistory,
            ],
            max_tokens: 100,
          });

          if (smart_ai_message?.choices?.[0]?.message?.content) {
            const aiResponse = smart_ai_message.choices[0].message.content;
            console.log("📤 Sending AI response as DM:", aiResponse);
            const direct_message = await sendDM(accountId, userId, aiResponse, token);
            console.log("✅ DM sent successfully:", direct_message);
            await createChatHistory(automation.id, userId, accountId, messageText);
            await createChatHistory(automation.id, accountId, userId, aiResponse);
            await trackResponses(automation.id, 'DM');
            return NextResponse.json({ message: 'AI response sent' }, { status: 200 });
          } else {
            console.error("❌ No content in AI response:", smart_ai_message);
            const fallbackResponse = generateSmartFallback(messageText, automation.listener?.prompt);
            console.log("📤 Sending smart fallback DM:", fallbackResponse);
            const direct_message = await sendDM(accountId, userId, fallbackResponse, token);
            console.log("✅ Fallback DM sent successfully:", direct_message);
            await createChatHistory(automation.id, userId, accountId, messageText);
            await createChatHistory(automation.id, accountId, userId, fallbackResponse);
            await trackResponses(automation.id, 'DM');
            return NextResponse.json({ message: 'Fallback response sent' }, { status: 200 });
          }
        } catch (error) {
          console.error("❌ Error in AI-powered block:", error);
          const fallbackResponse = generateSmartFallback(messageText, automation.listener?.prompt);
          console.log("📤 Sending smart fallback DM:", fallbackResponse);
          const direct_message = await sendDM(accountId, userId, fallbackResponse, token);
          console.log("✅ Fallback DM sent successfully:", direct_message);
          await createChatHistory(automation.id, userId, accountId, messageText);
          await createChatHistory(automation.id, accountId, userId, fallbackResponse);
          await trackResponses(automation.id, 'DM');
          return NextResponse.json({ message: 'Fallback response sent' }, { status: 200 });
        }
      } else {
        try {
          const templateMessage = automation.listener?.prompt || "Hello! How can we assist you today?";
          console.log("📤 Sending template DM for non-PRO user:", templateMessage);
          const direct_message = await sendDM(accountId, userId, templateMessage, token);
          console.log("✅ DM sent successfully:", direct_message);
          await createChatHistory(automation.id, userId, accountId, messageText);
          await createChatHistory(automation.id, accountId, userId, templateMessage);
          await trackResponses(automation.id, 'DM');
          return NextResponse.json({ message: 'Message sent' }, { status: 200 });
        } catch (error) {
          console.error("❌ Error sending template DM for non-PRO user:", error);
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