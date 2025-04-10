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

type AutomationWithIncludes = {
  active: any;
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
  const hub = req.nextUrl.searchParams.get('hub.challenge');
  return new NextResponse(hub);
}

function generateSmartFallback(accountId: string, prompt: string): string {
  return `${prompt} fallback for ${accountId}`;
}

export async function POST(req: NextRequest) {
  try {
    const webhook_payload = await req.json();
    console.log("=== WEBHOOK DEBUG START ===");
    console.log("Payload:", JSON.stringify(webhook_payload, null, 2));

    const entry = webhook_payload.entry?.[0];
    if (!entry) {
      console.log("❌ No entry");
      return NextResponse.json({ message: 'No entry' }, { status: 200 });
    }

    console.log("Entry ID:", entry.id);

    const messaging = entry.messaging?.[0];
    if (!messaging?.message?.text || messaging.read || messaging.message.is_echo) {
      console.log("Skipping non-text, read, or echo");
      return NextResponse.json({ message: 'Skipped' }, { status: 200 });
    }

    const messageText = messaging.message.text;
    const userId = messaging.sender.id;
    const accountId = entry.id; // Instagram ID
    console.log("📝 Message:", messageText, "User:", userId, "Account:", accountId);

    // Fetch integration to get userId
    const integration = await client.integrations.findFirst({
      where: { instagramId: accountId },
      select: { userId: true, token: true },
    });
    if (!integration || !integration.userId) {
      console.log("❌ No integration for:", accountId);
      return NextResponse.json({ message: 'No integration' }, { status: 200 });
    }

    // Look for automation tied to this Instagram account
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

    // Check if automation is active
    if (!automation || !automation.active) {
      console.log("⚠️ Automation not active or not found, creating...");
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
          active: true,  // Ensure automation is active
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
      console.log("✅ Created and activated automation:", automation.id);
    } else {
      console.log("🤖 Using existing automation:", automation.id);
    }

    console.log("🔍 Raw Automation Data:", JSON.stringify(automation, null, 2));
    const prompt = automation.listener?.prompt || `Assistant for WebProdigies_${accountId}`;
    console.log("🔍 Prompt from DB:", prompt);

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
    if (plan === 'PRO') {
      try {
        console.log("🤖 PRO AI response");
        const messageResponse = `Hello from ${accountId}! How can I assist?`;
        console.log("📤 PRO response:", messageResponse);
        const dmResponse = await sendDM(accountId, userId, messageResponse, token);
        console.log("✅ Sent DM:", JSON.stringify(dmResponse, null, 2));
        await createChatHistory(automation.id, userId, accountId, messageText);
        await createChatHistory(automation.id, accountId, userId, messageResponse);
        await trackResponses(automation.id, 'DM');
        return NextResponse.json({ message: 'AI sent' }, { status: 200 });
      } catch (error) {
        console.error("❌ AI error:", error);
        const fallbackResponse = generateSmartFallback(accountId, prompt);
        console.log("📤 Fallback:", fallbackResponse);
        try {
          const dmResponse = await sendDM(accountId, userId, fallbackResponse, token);
          console.log("✅ Fallback sent:", JSON.stringify(dmResponse, null, 2));
          await createChatHistory(automation.id, userId, accountId, messageText);
          await createChatHistory(automation.id, accountId, userId, fallbackResponse);
          await trackResponses(automation.id, 'DM');
          return NextResponse.json({ message: 'Fallback sent' }, { status: 200 });
        } catch (fallbackError) {
          console.error("❌ Fallback error:", fallbackError);
          return NextResponse.json({ message: 'Failed to send message' }, { status: 500 });
        }
      }
    } else {
      try {
        const messageResponse = `Hello from ${accountId}! How can I help?`;
        console.log("📤 FREE response:", messageResponse);
        const dmResponse = await sendDM(accountId, userId, messageResponse, token);
        console.log("✅ Sent:", JSON.stringify(dmResponse, null, 2));
        await createChatHistory(automation.id, userId, accountId, messageText);
        await createChatHistory(automation.id, accountId, userId, messageResponse);
        await trackResponses(automation.id, 'DM');
        return NextResponse.json({ message: 'FREE sent' }, { status: 200 });
      } catch (error) {
        console.error("❌ FREE error:", error);
        return NextResponse.json({ message: 'Error' }, { status: 500 });
      }
    }
  } catch (error) {
    console.error("❌ Webhook error:", error);
    return NextResponse.json({ message: 'Webhook error' }, { status: 500 });
  }
}
