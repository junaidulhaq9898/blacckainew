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

// Store processed comment IDs to prevent duplicates
const processedComments = new Set<string>();

interface Integration {
  token: string;
  instagramId: string | null;
}

export async function GET(req: NextRequest) {
  const hub = req.nextUrl.searchParams.get('hub.challenge');
  return new NextResponse(hub);
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

    // Handle Comments
    if (entry.changes && entry.changes[0].field === 'comments') {
      const commentData = entry.changes[0].value;
      const commentText = commentData.text.toLowerCase();
      const commentId = commentData.id;
      const postId = commentData.media.id;
      const commenterId = commentData.from.id;

      // Check if comment was already processed
      if (processedComments.has(commentId)) {
        console.log("ℹ️ Comment already processed:", commentId);
        return NextResponse.json({ message: 'Comment already processed' }, { status: 200 });
      }

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

      if (!automation || !automation.listener?.prompt) {
        console.log("❌ No automation or prompt found for post ID:", postId);
        return NextResponse.json({ message: 'No automation or prompt found' }, { status: 200 });
      }

      console.log("🔍 Automation found:", automation.id, "Plan:", automation.User?.subscription?.plan);

      const token = automation.User?.integrations[0]?.token;
      if (!token) {
        console.log("❌ No valid integration token found");
        return NextResponse.json({ message: 'No valid integration token' }, { status: 200 });
      }

      const plan = automation.User?.subscription?.plan || 'FREE';
      const prompt = automation.listener.prompt;

      // Comment Reply - Use user-set value for both plans
      let commentReply = automation.listener.commentReply || 'Thanks for commenting!';
      try {
        console.log("📤 Sending comment reply:", commentReply);
        const replyResponse = await sendCommentReply(commentId, commentReply, token);
        console.log("✅ Comment reply sent successfully:", replyResponse);
        await trackResponses(automation.id, 'COMMENT');
        processedComments.add(commentId); // Mark as processed
      } catch (error) {
        console.error("❌ Error sending comment reply:", error);
      }

      // DM Intro
      let dmMessage = prompt;
      if (plan === 'PRO') {
        console.log("🤖 PRO: Generating AI DM intro");
        const aiResponse = await openai.chat.completions.create({
          model: 'gpt-3.5-turbo',
          messages: [
            { role: 'system', content: `${prompt}\n\nGenerate a friendly intro DM (max 500 chars) responding to the comment: "${commentText}"` },
            { role: 'user', content: commentText },
          ],
          max_tokens: 100,
          temperature: 0.1,
        });
        dmMessage = aiResponse.choices?.[0]?.message?.content || prompt;
        if (dmMessage.length > 500) dmMessage = dmMessage.substring(0, 497) + "...";
      }

      try {
        console.log("📤 Sending DM with intro:", dmMessage);
        const dmResponse = await sendDM(entry.id, commenterId, dmMessage, token);
        console.log("✅ DM sent successfully:", dmResponse);
        await createChatHistory(automation.id, commenterId, entry.id, commentText);
        await createChatHistory(automation.id, entry.id, commenterId, dmMessage);
        await trackResponses(automation.id, 'DM');
      } catch (error) {
        console.error("❌ Error sending DM:", error);
      }

      console.log("✅ Comment processing completed");
      return NextResponse.json({ message: 'Comment processed' }, { status: 200 });
    }

    // Handle Messages
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

      if (!automation || !automation.listener?.prompt) {
        console.log("❌ No automation or prompt found for account:", accountId);
        return NextResponse.json({ message: 'No automation or prompt found' }, { status: 200 });
      }

      console.log("🔍 Automation plan:", automation.User?.subscription?.plan);

      const token = automation.User?.integrations.find((i: Integration) => i.instagramId === accountId)?.token || automation.User?.integrations[0]?.token;
      if (!token) {
        console.log("❌ No valid integration token found");
        return NextResponse.json({ message: 'No valid integration token' }, { status: 200 });
      }

      const plan = automation.User?.subscription?.plan || 'FREE';
      const prompt = automation.listener.prompt;

      let reply = prompt;
      if (plan === 'PRO') {
        console.log("🤖 PRO: Generating AI response");
        const limitedHistory = history.slice(-5);
        limitedHistory.push({ role: 'user', content: messageText });

        const aiResponse = await openai.chat.completions.create({
          model: 'gpt-3.5-turbo',
          messages: [
            { role: 'system', content: prompt },
            ...limitedHistory,
          ],
          max_tokens: 200, // Increased for full message
          temperature: 0.1,
        });
        reply = aiResponse.choices?.[0]?.message?.content || prompt;
        if (reply.length > 500) reply = reply.substring(0, 497) + "..."; // Roomier limit
      }

      try {
        console.log("📤 Sending DM:", reply);
        const dmResponse = await sendDM(accountId, userId, reply, token);
        console.log("✅ DM sent successfully:", dmResponse);
        await createChatHistory(automation.id, userId, accountId, messageText);
        await createChatHistory(automation.id, accountId, userId, reply);
        await trackResponses(automation.id, 'DM');
        return NextResponse.json({ message: `${plan} message sent` }, { status: 200 });
      } catch (error) {
        console.error("❌ Error sending DM:", error);
        return NextResponse.json({ message: 'Error sending message' }, { status: 500 });
      }
    }

    console.log("=== WEBHOOK DEBUG END ===");
    return NextResponse.json({ message: 'No automation set' }, { status: 200 });
  } catch (error) {
    console.error("❌ Webhook Error:", error);
    return NextResponse.json({ message: 'Error processing webhook' }, { status: 500 });
  }
}