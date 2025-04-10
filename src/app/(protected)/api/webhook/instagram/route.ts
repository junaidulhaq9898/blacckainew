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

// Log test to confirm logging works
console.log("=== Route file loaded ===");

type AutomationWithIncludes = {
  id: string;
  instagramId?: string | null;
  listener?: {
    prompt?: string;
    commentReply?: string | null;
    listener?: string;
    id?: string;
    dmCount?: number;
    commentCount?: number;
    automationId?: string;
  } | null;
  User?: {
    subscription?: { plan?: string } | null;
    integrations?: { token: string; instagramId?: string | null }[];
  } | null;
  keywords?: { id?: string; word?: string; automationId?: string | null }[];
};

export async function GET(req: NextRequest) {
  console.log("=== GET request received ===");
  const hub = req.nextUrl.searchParams.get('hub.challenge');
  console.log("Hub challenge:", hub);
  return new NextResponse(hub);
}

function generateSmartFallback(accountId: string, prompt: string): string {
  return `${prompt} fallback for ${accountId}`;
}

export async function POST(req: NextRequest) {
  console.log("=== WEBHOOK POST DEBUG START ==="); // First log
  try {
    const webhook_payload = await req.json();
    console.log("Payload received:", JSON.stringify(webhook_payload, null, 2));

    const entry = webhook_payload.entry?.[0];
    if (!entry) {
      console.log("❌ No entry in payload");
      return NextResponse.json({ message: 'No entry' }, { status: 200 });
    }

    console.log("Entry ID:", entry.id);

    const messaging = entry.messaging?.[0];
    if (!messaging?.message?.text || messaging.read || messaging.message.is_echo) {
      console.log("Skipping non-text, read, or echo:", {
        hasText: !!messaging?.message?.text,
        isRead: messaging?.read,
        isEcho: messaging?.message?.is_echo,
      });
      return NextResponse.json({ message: 'Skipped' }, { status: 200 });
    }

    const messageText = messaging.message.text;
    const userId = messaging.sender.id;
    const accountId = entry.id; // Instagram ID
    console.log("📝 Message:", messageText, "User:", userId, "Account:", accountId);

    // Fetch integration
    const integration = await client.integrations.findFirst({
      where: { instagramId: accountId },
      select: { userId: true, token: true },
    });
    console.log("🔍 Integration:", JSON.stringify(integration, null, 2));
    if (!integration || !integration.userId) {
      console.log("❌ No integration for:", accountId);
      return NextResponse.json({ message: 'No integration' }, { status: 200 });
    }

    // Look for automation
    let automation: AutomationWithIncludes | null = await client.automation.findFirst({
      where: { userId: integration.userId, instagramId: accountId },
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

    // Check chat history with expiry
    const { history, automationId: historyAutomationId } = await getChatHistory(userId, accountId);
    const historyExpiryMinutes = 10;
    const now = new Date();
    const lastMessage = history.length > 0
      ? await client.dms.findFirst({
          where: { senderId: userId, reciever: accountId },
          orderBy: { createdAt: 'desc' },
          select: { createdAt: true },
        })
      : null;
    const isHistoryExpired = lastMessage
      ? (now.getTime() - new Date(lastMessage.createdAt).getTime()) / (1000 * 60) > historyExpiryMinutes
      : true;
    const isOngoing = history.length > 0 && !isHistoryExpired;

    console.log("🔄 Ongoing:", isOngoing, "History length:", history.length, "History Automation ID:", historyAutomationId);
    console.log("⏰ Last message time:", lastMessage?.createdAt, "Expired:", isHistoryExpired);

    if (!automation) {
      console.log("⚠️ No automation for this account, creating...");
      automation = await client.automation.create({
        data: {
          userId: integration.userId,
          instagramId: accountId,
          listener: {
            create: {
              prompt: `Assistant for WebProdigies_${accountId}`,
              commentReply: "ok",
              listener: "SMARTAI",
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
      console.log("✅ Created automation:", automation.id);
    } else if (historyAutomationId && historyAutomationId !== automation.id && !isHistoryExpired) {
      console.log("⚠️ History Automation ID mismatch but not expired, sticking with:", automation.id);
    } else {
      console.log("🤖 Using existing automation:", automation.id);
    }

    console.log("🔍 Raw Automation Data:", JSON.stringify(automation, null, 2));
    const prompt = automation.listener?.prompt || `Assistant for WebProdigies_${accountId}`;
    console.log("🔍 Automation:", automation.id, "Prompt:", prompt);

    const integrations = automation.User?.integrations ?? [];
    console.log("🔍 Integrations:", JSON.stringify(integrations, null, 2));
    const matchingIntegration = integrations.find(i => i.instagramId === accountId);
    console.log("🔍 Matching Integration:", JSON.stringify(matchingIntegration, null, 2));

    let token: string;
    let tokenSource = "automation";
    const automationToken = matchingIntegration?.token;
    if (automationToken) {
      token = automationToken;
    } else {
      console.log("⚠️ No token in automation, trying integrations...");
      const fallbackToken = integrations.length > 0 ? integrations[0].token : null;
      if (fallbackToken) {
        token = fallbackToken;
        tokenSource = "integrations fallback";
      } else {
        console.log("⚠️ No token in integrations, using DB token...");
        token = integration.token;
        tokenSource = "DB";
      }
    }
    console.log(`✅ Using token from ${tokenSource}:`, token.substring(0, 10) + "...");

    const plan = automation.User?.subscription?.plan || 'FREE';
    console.log("🔍 Subscription Plan:", plan);

    // Force PRO logic since you're on PRO
    console.log("🤖 Forcing PRO AI response");
    try {
      const limitedHistory = history.slice(-5);
      limitedHistory.push({ role: 'user', content: messageText });

      const aiPrompt = `You are: ${prompt}. Reply ONLY about this business. No generic talk. Max 100 chars.`;
      console.log("🔧 AI Prompt:", aiPrompt);
      const smart_ai_message = await openai.chat.completions.create({
        model: 'google/gemma-3-27b-it:free', // Switch to 'gpt-3.5-turbo' if needed
        messages: [
          { role: 'system', content: aiPrompt },
          ...limitedHistory,
        ],
        max_tokens: 40,
        temperature: 0.1,
      });

      console.log("🔍 Raw AI Response:", JSON.stringify(smart_ai_message, null, 2));
      let aiResponse = smart_ai_message?.choices?.[0]?.message?.content;
      if (!aiResponse || aiResponse.trim() === "") {
        console.log("⚠️ AI returned empty, using fallback");
        aiResponse = generateSmartFallback(accountId, prompt);
      }
      if (aiResponse.length > 100) {
        aiResponse = aiResponse.substring(0, 97) + "...";
      }
      console.log("📤 AI response:", aiResponse);

      const dmResponse = await sendDM(accountId, userId, aiResponse, token);
      console.log("✅ Sent DM:", JSON.stringify(dmResponse, null, 2));
      await createChatHistory(automation.id, userId, accountId, messageText);
      await createChatHistory(automation.id, accountId, userId, aiResponse);
      await trackResponses(automation.id, 'DM');
      console.log("✅ Chat history and tracking updated");
      return NextResponse.json({ message: 'AI sent' }, { status: 200 });
    } catch (error) {
      console.error("❌ AI or DM error:", error);
      const fallbackResponse = generateSmartFallback(accountId, prompt);
      console.log("📤 Fallback response:", fallbackResponse);
      try {
        const dmResponse = await sendDM(accountId, userId, fallbackResponse, token);
        console.log("✅ Fallback sent:", JSON.stringify(dmResponse, null, 2));
        await createChatHistory(automation.id, userId, accountId, messageText);
        await createChatHistory(automation.id, accountId, userId, fallbackResponse);
        await trackResponses(automation.id, 'DM');
        console.log("✅ Chat history and tracking updated for fallback");
        return NextResponse.json({ message: 'Fallback sent' }, { status: 200 });
      } catch (fallbackError) {
        console.error("❌ Fallback error:", fallbackError);
        return NextResponse.json({ message: 'Failed to send message' }, { status: 500 });
      }
    }
  } catch (error) {
    console.error("❌ Webhook error:", error);
    return NextResponse.json({ message: 'Webhook error' }, { status: 500 });
  }
}