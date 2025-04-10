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
    prompt: string; // Required per schema
    commentReply?: string | null;
    listener: 'SMARTAI' | 'MESSAGE';
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
} | null; // Allow null to match Prisma's return type

export async function GET(req: NextRequest) {
  const hub = req.nextUrl.searchParams.get('hub.challenge');
  return new NextResponse(hub);
}

function generateSmartFallback(prompt: string): string {
  return `Hello! Based on our setup: ${prompt.slice(0, 50)}... How can I assist you today?`;
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
          console.log("❌ No automation for matched ID:", matcher.automationId);
          return NextResponse.json({ message: 'No automation' }, { status: 200 });
        }
        automation = result;
        console.log("🤖 Starting automation:", automation.id);
      } else {
        console.log("⚠️ No automation, fetching default...");
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
                subscription: { select: { plan: true } },
                integrations: { select: { token: true, instagramId: true } },
              },
            },
          },
        });
        if (!automation) {
          console.log("❌ No default automation, creating...");
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
                  subscription: { select: { plan: true } },
                  integrations: { select: { token: true, instagramId: true } },
                },
              },
            },
          });
          console.log("✅ Created automation:", automation.id);
        }
      }
    }

    // At this point, automation is guaranteed to be non-null due to creation fallback
    if (!automation.listener?.prompt) {
      console.log("⚠️ No prompt found, setting default...");
      automation.listener = {
        prompt: "Hello! I’m your assistant. How can I help?",
        listener: "SMARTAI",
      };
    }

    const prompt = automation.listener.prompt;
    console.log("🔍 Automation:", automation.id, "Plan:", automation.User?.subscription?.plan);
    console.log("🔍 Prompt from DB:", prompt);

    const token = automation.User?.integrations?.find(i => i.instagramId === accountId)?.token
      || automation.User?.integrations?.[0]?.token;
    if (!token) {
      console.log("❌ No valid token for:", accountId);
      return NextResponse.json({ message: 'No token' }, { status: 200 });
    }
    console.log("✅ Token:", token.substring(0, 10) + "...");

    const plan = automation.User?.subscription?.plan || 'FREE';
    if (plan === 'PRO') {
      try {
        console.log("🤖 PRO AI response");
        const limitedHistory = history.slice(-5);
        limitedHistory.push({ role: 'user', content: messageText });

        const aiPrompt = `You are an assistant for a specific business. ${prompt} Answer strictly as the business representative, using only the business context provided, and do not improvise details or mention being an AI, model, or anything unrelated.`;
        console.log("🔧 AI Prompt:", aiPrompt);

        const smart_ai_message = await openai.chat.completions.create({
          model: 'google/gemma-3-27b-it:free',
          messages: [
            { role: 'system', content: aiPrompt },
            ...limitedHistory,
          ],
          max_tokens: 100,
        });

        let aiResponse = smart_ai_message?.choices?.[0]?.message?.content;
        if (!aiResponse || aiResponse.trim() === "") {
          console.log("⚠️ AI empty, using fallback");
          aiResponse = generateSmartFallback(prompt);
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
        const fallbackResponse = generateSmartFallback(prompt);
        console.log("📤 Fallback:", fallbackResponse);
        const dmResponse = await sendDM(accountId, userId, fallbackResponse, token);
        console.log("✅ Fallback sent:", JSON.stringify(dmResponse, null, 2));
        await createChatHistory(automation.id, userId, accountId, messageText);
        await createChatHistory(automation.id, accountId, userId, fallbackResponse);
        await trackResponses(automation.id, 'DM');
        return NextResponse.json({ message: 'Fallback sent' }, { status: 200 });
      }
    } else {
      try {
        const freeResponse = generateSmartFallback(prompt);
        console.log("📤 FREE response:", freeResponse);
        const dmResponse = await sendDM(accountId, userId, freeResponse, token);
        console.log("✅ Sent:", JSON.stringify(dmResponse, null, 2));
        await createChatHistory(automation.id, userId, accountId, messageText);
        await createChatHistory(automation.id, accountId, userId, freeResponse);
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