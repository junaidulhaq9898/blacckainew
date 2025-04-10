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
    prompt: string;
    commentReply?: string | null;
    listener: 'SMARTAI' | 'MESSAGE';
    id?: string;
    dmCount?: number;
    commentCount?: number;
    automationId?: string;
  } | null;
  User?: {
    id?: string;
    subscription?: { plan?: string } | null;
    integrations?: { token: string; instagramId?: string | null }[] | null;
  } | null;
  keywords?: { id?: string; word?: string; automationId?: string | null }[] | null;
  dms?: { id: string; createdAt: Date; automationId: string | null; senderId: string | null; reciever: string | null; message: string | null }[] | null;
  trigger?: { id: string; type: string; automationId?: string | null }[] | null;
} | null;

export async function GET(req: NextRequest) {
  const hub = req.nextUrl.searchParams.get('hub.challenge');
  return new NextResponse(hub);
}

function generateSmartFallback(prompt: string, plan: string): string {
  return plan === 'PRO'
    ? `Hello! Per our setup: ${prompt.slice(0, 50)}... How can I assist today?`
    : `Hi! ${prompt.slice(0, 50)}... How can I help?`;
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

    const { history, automationId: historyAutomationId } = await getChatHistory(userId, accountId);
    const isOngoing = history.length > 0;
    console.log("🔄 Ongoing:", isOngoing, "History:", history.length, "Automation ID from history:", historyAutomationId);

    let automation: AutomationWithIncludes;
    // Prioritize account-specific automation over history
    automation = await client.automation.findFirst({
      where: {
        User: {
          integrations: { some: { instagramId: accountId } },
        },
      },
      include: {
        listener: true,
        User: {
          select: {
            id: true,
            subscription: { select: { plan: true } },
            integrations: { select: { token: true, instagramId: true } },
          },
        },
      },
    });

    if (!automation && isOngoing && historyAutomationId) {
      automation = await getKeywordAutomation(historyAutomationId, true);
      if (!automation) {
        console.log("❌ No automation found for history ID:", historyAutomationId);
      } else {
        console.log("🤖 Continuing automation from history:", automation.id);
      }
    }

    if (!automation) {
      const matcher = await matchKeyword(messageText);
      console.log("🔍 Keyword match:", matcher);
      if (matcher?.automationId) {
        automation = await getKeywordAutomation(matcher.automationId, true);
        if (!automation) {
          console.log("❌ No automation for matched ID:", matcher.automationId);
        } else {
          console.log("🤖 Starting automation from keyword:", automation.id);
        }
      }
    }

    if (!automation) {
      console.log("⚠️ No automation, creating default for account:", accountId);
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
              prompt: "Hello! I’m your assistant. How can I help?",
              listener: "SMARTAI",
            },
          },
        },
        include: {
          listener: true,
          User: {
            select: {
              id: true,
              subscription: { select: { plan: true } },
              integrations: { select: { token: true, instagramId: true } },
            },
          },
        },
      });
      console.log("✅ Created automation:", automation.id);
    }

    if (!automation!.listener?.prompt) {
      console.log("⚠️ No prompt found, setting default...");
      automation!.listener = {
        prompt: "Hello! I’m your assistant. How can I help?",
        listener: "SMARTAI",
      };
    }

    const prompt = automation!.listener!.prompt;
    const plan = automation!.User?.subscription?.plan || 'FREE';
    const businessUserId = automation!.User?.id || 'unknown';
    console.log("🔍 Automation:", automation!.id, "Plan:", plan, "Business User ID:", businessUserId);
    console.log("🔍 Prompt from DB:", prompt);

    const token = automation!.User?.integrations?.find(i => i?.instagramId === accountId)?.token
      || automation!.User?.integrations?.[0]?.token;
    if (!token) {
      console.log("❌ No valid token for:", accountId);
      return NextResponse.json({ message: 'No token' }, { status: 200 });
    }
    console.log("✅ Token:", token.substring(0, 10) + "...");

    if (plan === 'PRO') {
      try {
        console.log("🤖 PRO AI response");
        const limitedHistory = history.slice(-5);
        limitedHistory.push({ role: 'user', content: messageText });

        const aiPrompt = `You are an assistant for user ${businessUserId} with automation ${automation!.id}. Context: ${prompt}. Respond ONLY with info from this context to the question "${messageText}". No extra details, pricing, or plans unless specified. Keep it under 100 characters if possible.`;
        console.log("🔧 AI Prompt:", aiPrompt);

        const smart_ai_message = await openai.chat.completions.create({
          model: 'gpt-3.5-turbo', // Switch to a more reliable model
          messages: [
            { role: 'system', content: aiPrompt },
            ...limitedHistory,
          ],
          max_tokens: 50,
          temperature: 0.1,
        });

        let aiResponse = smart_ai_message?.choices?.[0]?.message?.content;
        // Check if response contains "Delight Brush" when it shouldn’t
        if (!aiResponse || aiResponse.trim() === "" || (prompt === "hello how i can help you" && aiResponse.includes("Delight Brush"))) {
          console.log("⚠️ AI empty or out of context, using fallback");
          aiResponse = "I’m here to assist. What’s your question?";
        }
        console.log("📤 AI response:", aiResponse);
        const dmResponse = await sendDM(accountId, userId, aiResponse, token);
        console.log("✅ Sent DM:", JSON.stringify(dmResponse, null, 2));
        await createChatHistory(automation!.id, userId, accountId, messageText);
        await createChatHistory(automation!.id, accountId, userId, aiResponse);
        await trackResponses(automation!.id, 'DM');
        return NextResponse.json({ message: 'AI sent' }, { status: 200 });
      } catch (error) {
        console.error("❌ AI error:", error);
        const fallbackResponse = generateSmartFallback(prompt, plan);
        console.log("📤 Fallback:", fallbackResponse);
        const dmResponse = await sendDM(accountId, userId, fallbackResponse, token);
        console.log("✅ Fallback sent:", JSON.stringify(dmResponse, null, 2));
        await createChatHistory(automation!.id, userId, accountId, messageText);
        await createChatHistory(automation!.id, accountId, userId, fallbackResponse);
        await trackResponses(automation!.id, 'DM');
        return NextResponse.json({ message: 'Fallback sent' }, { status: 200 });
      }
    } else {
      try {
        const freeResponse = generateSmartFallback(prompt, plan);
        console.log("📤 FREE response:", freeResponse);
        const dmResponse = await sendDM(accountId, userId, freeResponse, token);
        console.log("✅ Sent:", JSON.stringify(dmResponse, null, 2));
        await createChatHistory(automation!.id, userId, accountId, messageText);
        await createChatHistory(automation!.id, accountId, userId, freeResponse);
        await trackResponses(automation!.id, 'DM');
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