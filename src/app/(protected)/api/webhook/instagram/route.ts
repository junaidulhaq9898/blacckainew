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

type AutomationWithIncludes = {
  id: string;
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
    subscription?: {
      plan?: string;
    } | null;
    integrations?: {
      token: string;
      instagramId?: string | null;
    }[];
  } | null;
  keywords?: { id?: string; word?: string; automationId?: string | null }[];
};

export async function GET(req: NextRequest) {
  const hub = req.nextUrl.searchParams.get('hub.challenge');
  return new NextResponse(hub);
}

function generateSmartFallback(accountId: string): string {
  return `Hi from ${accountId}! How can I help?`;
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
    const accountId = entry.id;
    console.log("📝 Message:", messageText, "User:", userId, "Account:", accountId);

    const { history, automationId } = await getChatHistory(userId, accountId);
    const isOngoing = history.length > 0;
    console.log("🔄 Ongoing:", isOngoing, "History:", history.length, "Automation ID:", automationId);

    let automation: AutomationWithIncludes;
    if (isOngoing && automationId) {
      const result = await getKeywordAutomation(automationId, true);
      if (!result) {
        console.log("❌ No automation found for ID:", automationId);
        return NextResponse.json({ message: 'No automation' }, { status: 200 });
      }
      automation = result;
      console.log("🤖 Continuing automation:", automation.id);
    } else {
      const matcher = await matchKeyword(messageText);
      console.log("🔍 Keyword match:", matcher);
      if (matcher?.automationId) {
        const result = await getKeywordAutomation(matcher.automationId, true);
        if (!result) {
          console.log("❌ No automation found for matched ID:", matcher.automationId);
          return NextResponse.json({ message: 'No automation' }, { status: 200 });
        }
        automation = result;
        console.log("🤖 Starting automation:", automation.id);
      } else {
        console.log("⚠️ No automation, creating...");
        const integration = await client.integrations.findFirst({
          where: { instagramId: accountId },
          select: { userId: true, token: true },
        });
        if (!integration || !integration.userId) {
          console.log("❌ No integration for:", accountId);
          return NextResponse.json({ message: 'No integration' }, { status: 200 });
        }
        automation = await client.automation.create({
          data: {
            userId: integration.userId,
            listener: {
              create: {
                prompt: `You are a helpful assistant for my business, WebProdigies_${accountId}.`,
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
                integrations: { select: { token: true, instagramId: true } },
              },
            },
          },
        });
        console.log("✅ Created automation:", automation.id);
      }
    }

    const prompt = automation.listener?.prompt || `You are a helpful assistant for my business, WebProdigies_${accountId}.`;
    console.log("🔍 Automation:", automation.id, "Plan:", automation.User?.subscription?.plan);
    console.log("🔍 Prompt:", prompt);

    const integrations = automation.User?.integrations ?? [];
    console.log("🔍 Integrations from automation:", JSON.stringify(integrations, null, 2));
    const matchingIntegration = integrations.find(i => i.instagramId === accountId);
    console.log("🔍 Matching Integration:", JSON.stringify(matchingIntegration, null, 2));

    let token: string;
    let tokenSource = "automation";
    const automationToken = matchingIntegration?.token;
    if (automationToken) {
      token = automationToken;
    } else {
      console.log("⚠️ No token in automation match, trying integrations fallback...");
      const fallbackToken = integrations.length > 0 ? integrations[0].token : null;
      if (fallbackToken) {
        token = fallbackToken;
        tokenSource = "integrations fallback";
      } else {
        console.log("⚠️ No token in integrations, querying DB...");
        const integration = await client.integrations.findFirst({
          where: { instagramId: accountId },
          select: { token: true, instagramId: true },
        });
        console.log("🔍 DB Integration:", JSON.stringify(integration, null, 2));
        const dbToken = integration?.token;
        if (!dbToken) {
          console.log("❌ No valid token found for instagramId:", accountId);
          return NextResponse.json({ message: 'No token' }, { status: 200 });
        }
        token = dbToken;
        tokenSource = "DB";
      }
    }
    console.log(`✅ Using token from ${tokenSource}:`, token.substring(0, 10) + "...");

    const plan = automation.User?.subscription?.plan || 'FREE';
    if (plan === 'PRO') {
      try {
        console.log("🤖 PRO AI response");
        const limitedHistory = history.slice(-5);
        limitedHistory.push({ role: 'user', content: messageText });

        const aiPrompt = `You are a business assistant for: ${prompt}\n\nRespond ONLY with business details from the prompt. No AI talk. Under 100 chars. Professional.`;
        console.log("🔧 AI Prompt:", aiPrompt);
        const smart_ai_message = await openai.chat.completions.create({
          model: 'google/gemma-3-27b-it:free',
          messages: [
            { role: 'system', content: aiPrompt },
            ...limitedHistory,
          ],
          max_tokens: 40,
          temperature: 0.01,
        });

        console.log("🔍 Raw AI Response:", JSON.stringify(smart_ai_message, null, 2));
        let aiResponse = smart_ai_message?.choices?.[0]?.message?.content;
        if (!aiResponse || aiResponse.trim() === "") {
          console.log("⚠️ AI returned empty response, using fallback");
          aiResponse = generateSmartFallback(accountId);
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
        return NextResponse.json({ message: 'AI sent' }, { status: 200 });
      } catch (error) {
        console.error("❌ AI error:", error);
        const fallbackResponse = generateSmartFallback(accountId);
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
        const messageResponse = isOngoing
          ? `Thanks from ${accountId}! How can I assist?`
          : `Hello from ${accountId}! How can I help?`;
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