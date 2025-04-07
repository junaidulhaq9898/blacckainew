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

// Webhook verification endpoint
export async function GET(req: NextRequest) {
  const hub = req.nextUrl.searchParams.get('hub.challenge');
  return new NextResponse(hub);
}

// Simplified fallback to use prompt directly
function generateSmartFallback(messageText: string, prompt?: string): string {
  console.log("🔍 [Fallback] Message:", messageText, "Prompt:", prompt || 'None');
  return prompt || "Hello! How can I assist you today?";
}

// Main webhook handler
export async function POST(req: NextRequest) {
  try {
    const webhook_payload = await req.json();
    console.log("=== WEBHOOK DEBUG START ===");
    console.log("Full Webhook Payload:", JSON.stringify(webhook_payload, null, 2));
    console.log("🔍 Code version: 2025-04-07-v8");
    console.log("🔍 Processing account:", webhook_payload.entry?.[0]?.id || 'Unknown');

    const entry = webhook_payload.entry?.[0];
    if (!entry) {
      console.log("❌ No entry in payload");
      return NextResponse.json({ message: 'No entry found' }, { status: 200 });
    }

    const accountId = entry.id;
    console.log("🔍 Account ID:", accountId);

    // Fetch automation with broader query
    let automation = await client.automation.findFirst({
      where: {
        User: {
          integrations: {
            some: { instagramId: accountId },
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
      orderBy: { createdAt: 'desc' },
    });

    if (!automation) {
      console.log("❌ No automation found for account ID:", accountId);
      return NextResponse.json({ message: 'No automation found' }, { status: 200 });
    }

    const token = automation.User?.integrations?.find(i => i.instagramId === accountId)?.token;
    console.log("🔍 Automation ID:", automation.id, "Plan:", automation.User?.subscription?.plan, "Token:", !!token);
    console.log("🔍 Listener:", JSON.stringify(automation.listener));

    if (!token) {
      console.log("❌ No valid token for account:", accountId);
      return NextResponse.json({ message: 'No valid token' }, { status: 200 });
    }

    // Handle comments
    if (entry.changes?.[0]?.field === 'comments') {
      console.log("🔍 Processing comment");
      const commentData = entry.changes[0].value;
      const commentText = commentData.text.toLowerCase();
      const commentId = commentData.id;
      const commenterId = commentData.from.id;

      console.log("📝 Comment:", commentText, "From:", commenterId);

      // Always attempt comment reply if set
      if (automation.listener?.commentReply) {
        console.log("📤 Sending comment reply:", automation.listener.commentReply);
        try {
          const replyResponse = await sendCommentReply(commentId, automation.listener.commentReply, token);
          console.log("✅ Comment reply sent:", replyResponse);
          await trackResponses(automation.id, 'COMMENT');
        } catch (error) {
          console.error("❌ Comment reply error:", error);
        }
      }

      const { history } = await getChatHistory(commenterId, accountId);
      console.log("🔍 History length:", history.length);

      if (automation.User?.subscription?.plan === 'PRO') {
        console.log("🤖 PRO comment processing");
        const limitedHistory = history.slice(-5);
        limitedHistory.push({ role: 'user', content: commentText });

        const aiPrompt = automation.listener?.prompt || "You are a customer service assistant. Answer in 1-2 sentences.";
        console.log("🔍 AI Prompt:", aiPrompt);

        try {
          const smart_ai_message = await openai.chat.completions.create({
            model: 'google/gemma-3-27b-it:free',
            messages: [
              { role: 'system', content: aiPrompt },
              ...limitedHistory,
            ],
          });

          const aiResponse = smart_ai_message?.choices?.[0]?.message?.content || generateSmartFallback(commentText, aiPrompt);
          console.log("📤 Sending AI DM:", aiResponse);
          const dmResponse = await sendDM(accountId, commenterId, aiResponse, token);
          console.log("✅ DM sent:", dmResponse);
          await createChatHistory(automation.id, commenterId, accountId, commentText);
          await createChatHistory(automation.id, accountId, commenterId, aiResponse);
          await trackResponses(automation.id, 'DM');
        } catch (error) {
          console.error("❌ PRO comment error:", error);
          const fallback = generateSmartFallback(commentText, automation.listener?.prompt);
          await sendDM(accountId, commenterId, fallback, token);
        }
      } else if (history.length === 0) {
        console.log("🔍 Free plan first comment");
        const freeResponse = generateSmartFallback(commentText, automation.listener?.prompt);
        console.log("📤 Sending free DM:", freeResponse);
        try {
          const dmResponse = await sendDM(accountId, commenterId, freeResponse, token);
          console.log("✅ Free DM sent:", dmResponse);
          await createChatHistory(automation.id, commenterId, accountId, commentText);
          await createChatHistory(automation.id, accountId, commenterId, freeResponse);
          await trackResponses(automation.id, 'DM');
        } catch (error) {
          console.error("❌ Free DM error:", error);
        }
      } else {
        console.log("⚠️ Free plan: No follow-up");
      }

      return NextResponse.json({ message: 'Comment processed' }, { status: 200 });
    }

    // Handle messages
    const messaging = entry.messaging?.[0];
    console.log("🔍 Message payload:", JSON.stringify(messaging, null, 2));

    if (messaging?.read || messaging?.message?.is_echo) {
      console.log("🔍 Skipping read/echo");
      return NextResponse.json({ message: 'Receipt processed' }, { status: 200 });
    }

    if (messaging?.message?.text) {
      console.log("🔍 Processing message");
      const messageText = messaging.message.text;
      const userId = messaging.sender.id;

      console.log("📝 Message:", messageText, "From:", userId);

      const { history, automationId } = await getChatHistory(userId, accountId);
      console.log("🔍 History length:", history.length, "Automation ID:", automationId);

      if (automation.User?.subscription?.plan === 'PRO') {
        console.log("🤖 PRO message processing");
        const limitedHistory = history.slice(-5);
        limitedHistory.push({ role: 'user', content: messageText });

        const aiPrompt = automation.listener?.prompt || "You are a customer service assistant. Answer in 1-2 sentences.";
        console.log("🔍 AI Prompt:", aiPrompt);

        try {
          const smart_ai_message = await openai.chat.completions.create({
            model: 'google/gemma-3-27b-it:free',
            messages: [
              { role: 'system', content: aiPrompt },
              ...limitedHistory,
            ],
          });

          const aiResponse = smart_ai_message?.choices?.[0]?.message?.content || generateSmartFallback(messageText, aiPrompt);
          console.log("📤 Sending AI DM:", aiResponse);
          const direct_message = await sendDM(accountId, userId, aiResponse, token);
          console.log("✅ DM sent:", direct_message);
          await createChatHistory(automation.id, userId, accountId, messageText);
          await createChatHistory(automation.id, accountId, userId, aiResponse);
          await trackResponses(automation.id, 'DM');
          return NextResponse.json({ message: 'AI response sent' }, { status: 200 });
        } catch (error) {
          console.error("❌ PRO message error:", error);
          const fallback = generateSmartFallback(messageText, automation.listener?.prompt);
          await sendDM(accountId, userId, fallback, token);
          return NextResponse.json({ message: 'Fallback sent' }, { status: 200 });
        }
      } else if (history.length === 0) {
        console.log("🔍 Free plan first message");
        const matcher = await matchKeyword(messageText);
        console.log("🔍 Keyword match:", matcher);
        const freeResponse = matcher?.automationId
          ? generateSmartFallback(messageText, automation.listener?.prompt)
          : "Hello! How can I assist you today?";
        console.log("📤 Sending free DM:", freeResponse);
        try {
          const direct_message = await sendDM(accountId, userId, freeResponse, token);
          console.log("✅ Free DM sent:", direct_message);
          await createChatHistory(automation.id, userId, accountId, messageText);
          await createChatHistory(automation.id, accountId, userId, freeResponse);
          await trackResponses(automation.id, 'DM');
          return NextResponse.json({ message: 'Free DM sent' }, { status: 200 });
        } catch (error) {
          console.error("❌ Free DM error:", error);
          return NextResponse.json({ message: 'Error sending free DM' }, { status: 500 });
        }
      } else {
        console.log("⚠️ Free plan: No follow-up");
        return NextResponse.json({ message: 'No follow-up' }, { status: 200 });
      }
    }

    console.log("🔍 No actionable payload");
    console.log("=== WEBHOOK DEBUG END ===");
    return NextResponse.json({ message: 'No action taken' }, { status: 200 });
  } catch (error) {
    console.error("❌ Webhook Error:", error);
    return NextResponse.json({ message: 'Webhook error' }, { status: 500 });
  }
}