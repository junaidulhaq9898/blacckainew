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
import { client } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

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

async function validateToken(token: string): Promise<boolean> {
  try {
    const response = await axios.get('https://graph.instagram.com/me', {
      params: { fields: 'id,username', access_token: token },
    });
    console.log("Token validated:", response.data);
    return true;
  } catch (error: any) {
    console.error("Token validation failed:", {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data,
    });
    return false;
  }
}

export async function POST(req: NextRequest) {
  try {
    const webhook_payload = await req.json();
    console.log("=== WEBHOOK DEBUG START ===");
    console.log("Full Webhook Payload:", JSON.stringify(webhook_payload, null, 2));

    const entry = webhook_payload.entry?.[0];
    if (!entry) {
      console.log("No entry in webhook payload");
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
      const parentId = commentData.parent_id;

      // Check if comment was already processed
      if (processedComments.has(commentId)) {
        console.log("Comment already processed:", commentId);
        return NextResponse.json({ message: 'Comment already processed' }, { status: 200 });
      }

      console.log("Processing comment:", commentText, "Comment ID:", commentId, "Post ID:", postId, "Commenter ID:", commenterId);

      // Skip DMs for reply comments
      const isReplyComment = !!parentId;
      if (isReplyComment) {
        console.log("Skipping DM for reply comment:", commentId, "Parent ID:", parentId);
      }

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
              integrations: { select: { token: true, instagramId: true } },
            },
          },
        },
      });

      if (!automation || !automation.listener?.prompt || !automation.listener?.commentReply) {
        console.log("No automation, prompt, or commentReply found for post ID:", postId);
        return NextResponse.json({ message: 'No automation or listener data found' }, { status: 200 });
      }

      console.log("Automation found:", automation.id, "Plan:", automation.User?.subscription?.plan);

      const token = automation.User?.integrations.find((i: Integration) => i.instagramId === entry.id)?.token || automation.User?.integrations[0]?.token;
      if (!token) {
        console.log("No valid integration token found");
        return NextResponse.json({ message: 'No valid integration token' }, { status: 200 });
      }

      // Validate token
      const isTokenValid = await validateToken(token);
      if (!isTokenValid) {
        console.log("Invalid token, skipping comment reply and DM");
        return NextResponse.json({ message: 'Invalid token' }, { status: 200 });
      }

      const plan = automation.User?.subscription?.plan || 'FREE';
      const prompt = automation.listener.prompt;
      const commentReply = automation.listener.commentReply;

      // Comment Reply (same for PRO and FREE)
      try {
        console.log("Sending comment reply:", commentReply);
        const replyResponse = await sendCommentReply(commentId, commentReply, token);
        console.log("Comment reply sent successfully:", replyResponse);
        await trackResponses(automation.id, 'COMMENT', commentId);
        processedComments.add(commentId);
      } catch (error: any) {
        console.error("Error sending comment reply:", {
          commentId,
          message: error.message,
          status: error.response?.status,
          data: error.response?.data,
        });
      }

      // DM Intro (only for top-level comments)
      if (!isReplyComment) {
        let dmMessage = prompt;
        if (plan === 'PRO') {
          console.log("PRO: Checking keyword for DM");
          const matcher = await matchKeyword(commentText);
          console.log("Keyword match result:", matcher);
          if (matcher?.automationId) {
            const keywordAutomation = await getKeywordAutomation(matcher.automationId, true);
            dmMessage = keywordAutomation?.listener?.prompt || prompt;
            console.log("Using keyword prompt:", dmMessage.substring(0, 50) + (dmMessage.length > 50 ? '...' : ''));
          } else {
            console.log("No keyword match, using default prompt");
          }
        }

        // Truncate to 300 chars
        if (dmMessage.length > 300) {
          console.warn(`DM message too long (${dmMessage.length} chars), truncating to 300 chars`);
          dmMessage = dmMessage.substring(0, 297) + "...";
        }

        try {
          console.log("Sending DM with intro:", dmMessage.substring(0, 50) + (dmMessage.length > 50 ? '...' : ''));
          const dmResponse = await sendDM(entry.id, commenterId, dmMessage, token);
          console.log("DM sent successfully:", dmResponse);
          await createChatHistory(automation.id, commenterId, entry.id, commentText);
          await createChatHistory(automation.id, entry.id, commenterId, dmMessage);
          await trackResponses(automation.id, 'DM', commentId);
        } catch (error: any) {
          console.error("Error sending DM:", {
            message: error.message,
            status: error.response?.status,
            data: error.response?.data,
          });
        }
      }

      console.log("Comment processing completed");
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

      console.log("Processing message:", messageText);
      console.log("Sender ID (userId):", userId, "Recipient ID (accountId):", accountId);

      const { history, automationId } = await getChatHistory(userId, accountId);
      const isOngoing = history.length > 0;
      console.log("Ongoing conversation check:", isOngoing, "History length:", history.length, "Automation ID from history:", automationId);

      let automation;
      if (isOngoing && automationId) {
        automation = await getKeywordAutomation(automationId, true);
        console.log("Continuing with ongoing automation:", automation?.id);
      } else {
        const matcher = await matchKeyword(messageText);
        console.log("Keyword match result:", matcher);
        if (matcher?.automationId) {
          automation = await getKeywordAutomation(matcher.automationId, true);
          console.log("Starting automation via keyword:", automation?.id);
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
            console.log("Started automation for new user:", automation.id);
          } else {
            console.log("No automation found for account:", accountId);
            return NextResponse.json({ message: 'No automation found' }, { status: 200 });
          }
        }
      }

      if (!automation || !automation.listener?.prompt) {
        console.log("No automation or prompt found for account:", accountId);
        return NextResponse.json({ message: 'No automation or prompt found' }, { status: 200 });
      }

      console.log("Automation plan:", automation.User?.subscription?.plan);

      const token = automation.User?.integrations.find((i: Integration) => i.instagramId === accountId)?.token || automation.User?.integrations[0]?.token;
      if (!token) {
        console.log("No valid integration token found");
        return NextResponse.json({ message: 'No valid integration token' }, { status: 200 });
      }

      const plan = automation.User?.subscription?.plan || 'FREE';
      const prompt = automation.listener.prompt;

      let reply = prompt;
      if (plan === 'PRO') {
        console.log("PRO: Checking keyword for DM");
        const matcher = await matchKeyword(messageText);
        console.log("Keyword match result:", matcher);
        if (matcher?.automationId) {
          const keywordAutomation = await getKeywordAutomation(matcher.automationId, true);
          reply = keywordAutomation?.listener?.prompt || prompt;
          console.log("Using keyword prompt:", reply.substring(0, 50) + (reply.length > 50 ? '...' : ''));
        } else {
          console.log("No keyword match, using default prompt");
        }
      }

      // Truncate to 300 chars
      if (reply.length > 300) {
        console.warn(`DM reply too long (${reply.length} chars), truncating to 300 chars`);
        reply = reply.substring(0, 297) + "...";
      }

      try {
        console.log("Sending DM:", reply.substring(0, 50) + (reply.length > 50 ? '...' : ''));
        const dmResponse = await sendDM(accountId, userId, reply, token);
        console.log("DM sent successfully:", dmResponse);
        await createChatHistory(automation.id, userId, accountId, messageText);
        await createChatHistory(automation.id, accountId, userId, reply);
        await trackResponses(automation.id, 'DM');
      } catch (error: any) {
        console.error("Error sending DM:", {
          message: error.message,
          status: error.response?.status,
          data: error.response?.data,
        });
      }

      console.log("Message processing completed");
      return NextResponse.json({ message: `${plan} message sent` }, { status: 200 });
    }

    console.log("=== WEBHOOK DEBUG END ===");
    return NextResponse.json({ message: 'No automation set' }, { status: 200 });
  } catch (error: any) {
    console.error("Webhook Error:", {
      message: error.message,
      stack: error.stack,
    });
    return NextResponse.json({ message: 'Error processing webhook' }, { status: 500 });
  }
}