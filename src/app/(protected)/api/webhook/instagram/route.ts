// src/app/(protected)/api/webhook/instagram/route.ts
import {
  createChatHistory,
  getChatHistory,
  getKeywordAutomation,
  matchKeyword,
  trackResponses,
} from '@/actions/webhook/queries';
import { sendDM } from '@/lib/fetch';
import { openai } from '@/lib/openai';
import { client } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

// Webhook verification endpoint
export async function GET(req: NextRequest) {
  const hub = req.nextUrl.searchParams.get('hub.challenge');
  return new NextResponse(hub);
}

// Minimal fallback for non-PRO or failed AI
function generateSmartFallback(): string {
  return "Thanks for reaching out! How can I assist you today?";
}

// Main webhook handler (only message section rewritten for clarity)
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

    // Skip comments for now, focus on messages
    const messaging = entry.messaging?.[0];
    if (!messaging?.message?.text || messaging.read || messaging.message.is_echo) {
      console.log("Skipping non-text, read receipt, or echo message");
      return NextResponse.json({ message: 'Receipt processed' }, { status: 200 });
    }

    const messageText = messaging.message.text;
    const userId = messaging.sender.id;
    const accountId = entry.id;

    console.log("📝 Processing message:", messageText);

    // Get or create automation
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
      }
    }

    if (!automation) {
      console.log("⚠️ No automation, creating new...");
      const integration = await client.integrations.findFirst({
        where: { instagramId: accountId },
        select: { userId: true, token: true },
      });
      if (!integration || !integration.userId) {
        console.log("❌ No integration for account ID:", accountId);
        return NextResponse.json({ message: 'No integration found' }, { status: 200 });
      }
      automation = await client.automation.create({
        data: {
          userId: integration.userId,
          listener: {
            create: {
              prompt: "You are a helpful assistant for my business.",
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
      console.log("✅ Created automation:", automation.id);
    }

    console.log("🔍 Automation:", automation.id, "Plan:", automation.User?.subscription?.plan);
    console.log("🔍 Listener prompt:", automation.listener?.prompt);

    const token = automation.User?.integrations?.[0]?.token;
    if (!token) {
      console.log("❌ No valid token found");
      return NextResponse.json({ message: 'No valid integration token' }, { status: 200 });
    }

    const plan = automation.User?.subscription?.plan || 'FREE';
    if (plan === 'PRO') {
      try {
        console.log("🤖 Generating PRO AI response");
        const limitedHistory = history.slice(-5);
        limitedHistory.push({ role: 'user', content: messageText });

        const aiPrompt = `${automation.listener?.prompt || "You are a helpful assistant for my business."}\n\nRespond only with information from this prompt. Keep it short (under 100 chars), professional, and business-focused. No extra commentary.`;
        const smart_ai_message = await openai.chat.completions.create({
          model: 'google/gemma-3-27b-it:free',
          messages: [{ role: 'system', content: aiPrompt }, ...limitedHistory],
          max_tokens: 40, // ~80-100 chars
          temperature: 0.3, // Reduce randomness
        });

        let aiResponse = smart_ai_message?.choices?.[0]?.message?.content || generateSmartFallback();
        if (aiResponse.length > 1000) {
          aiResponse = aiResponse.substring(0, 997) + "...";
        }
        console.log("📤 Sending AI response:", aiResponse);
        const dmResponse = await sendDM(accountId, userId, aiResponse, token);
        console.log("✅ DM sent:", dmResponse);
        await createChatHistory(automation.id, userId, accountId, messageText);
        await createChatHistory(automation.id, accountId, userId, aiResponse);
        await trackResponses(automation.id, 'DM');
        return NextResponse.json({ message: 'AI response sent' }, { status: 200 });
      } catch (error) {
        console.error("❌ AI DM error:", error);
        const fallbackResponse = generateSmartFallback();
        console.log("📤 Sending fallback:", fallbackResponse);
        const dmResponse = await sendDM(accountId, userId, fallbackResponse, token);
        console.log("✅ Fallback sent:", dmResponse);
        await createChatHistory(automation.id, userId, accountId, messageText);
        await createChatHistory(automation.id, accountId, userId, fallbackResponse);
        await trackResponses(automation.id, 'DM');
        return NextResponse.json({ message: 'Fallback sent' }, { status: 200 });
      }
    } else {
      try {
        const messageResponse = isOngoing
          ? "Thanks for reaching out! How can I assist you today?"
          : "Hello! How can I assist you today?";
        console.log("📤 Sending FREE response:", messageResponse);
        const dmResponse = await sendDM(accountId, userId, messageResponse, token);
        console.log("✅ DM sent:", dmResponse);
        await createChatHistory(automation.id, userId, accountId, messageText);
        await createChatHistory(automation.id, accountId, userId, messageResponse);
        await trackResponses(automation.id, 'DM');
        return NextResponse.json({ message: 'Message sent' }, { status: 200 });
      } catch (error) {
        console.error("❌ FREE DM error:", error);
        return NextResponse.json({ message: 'Error sending message' }, { status: 500 });
      }
    }
  } catch (error) {
    console.error("❌ Webhook Error:", error);
    return NextResponse.json({ message: 'Error processing webhook' }, { status: 500 });
  }
}