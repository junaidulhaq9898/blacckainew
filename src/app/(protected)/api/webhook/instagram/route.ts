// src/app/(protected)/api/webhook/instagram/route.ts
import { findAutomation } from '@/actions/automations/queries';
import {
  createChatHistory,
  getChatHistory,
  getKeywordAutomation,
  hasRecentMessages,
  matchKeyword,
  trackResponses,
} from '@/actions/webhook/queries';
import { sendDM, sendCommentReply } from '@/lib/fetch';
import { openai } from '@/lib/openai';
import { client } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

interface Automation {
  id: string;
  name: string;
  active: boolean;
  userId: string | null;
  keywords: { id: string; word: string; automationId: string | null }[];
  listener: {
    id: string;
    automationId: string;
    listener: 'SMARTAI' | 'MESSAGE';
    prompt: string;
    commentReply?: string | null;
    dmCount: number;
    commentCount: number;
  } | null;
  trigger: { id: string; type: string; automationId: string | null }[];
  dms: {
    id: string;
    automationId: string | null;
    createdAt: Date;
    senderId: string | null;
    reciever: string | null;
    message: string | null;
  }[];
  User: {
    id: string;
    clerkId: string;
    email: string;
    firstname: string | null;
    lastname: string | null;
    createdAt: Date;
    subscription?: {
      id: string;
      userId: string | null;
      createdAt: Date;
      plan: 'PRO' | 'FREE';
      updatedAt: Date;
      customerId: string | null;
    } | null;
    integrations: {
      id: string;
      name: 'INSTAGRAM';
      createdAt: Date;
      userId: string | null;
      token: string;
      expiresAt: Date | null;
      instagramId: string | null;
    }[];
  } | null;
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

    if (entry.changes && entry.changes[0].field === 'comments') {
      const commentData = entry.changes[0].value;
      const commentText = commentData.text.toLowerCase();
      const commentId = commentData.id;
      const postId = commentData.media.id;
      const commenterId = commentData.from.id;

      console.log("📝 Processing comment:", commentText);

      // Find automation linked to the post, ensuring keywords are included
      const automation: Automation | null = await client.automation.findFirst({
        where: {
          posts: {
            some: {
              postid: postId,
            },
          },
        },
        include: {
          keywords: true,
          listener: true,
          trigger: true,
          dms: true,
          User: {
            include: {
              integrations: true,
              subscription: true,
            },
          },
        },
      });

      if (!automation) {
        console.log("❌ No automation found for post ID:", postId);
        return NextResponse.json({ message: 'No automation found' }, { status: 200 });
      }

      // Check if comment contains any keywords
      const keywordMatch = automation.keywords.some((keyword) =>
        commentText.includes(keyword.word.toLowerCase())
      );
      if (!keywordMatch) {
        console.log("❌ No keyword match found in comment");
        return NextResponse.json({ message: 'No keyword match' }, { status: 200 });
      }

      // Get Instagram token
      const token = automation.User?.integrations?.[0]?.token;
      if (!token) {
        console.log("❌ No valid integration token found");
        return NextResponse.json({ message: 'No valid integration token' }, { status: 200 });
      }

      // Reply to comment if configured
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

      // Send a simple DM if configured, not the chatbot prompt
      if (automation.listener?.commentReply) { // Assuming DM should mirror commentReply intent
        try {
          const dmMessage = `Thanks for your comment: "${commentText}"! How can we assist you today?`;
          console.log("📤 Sending DM:", dmMessage);
          const dmResponse = await sendDM(entry.id, commenterId, dmMessage, token);
          console.log("✅ DM sent successfully:", dmResponse);
          await trackResponses(automation.id, 'DM');
        } catch (error: unknown) {
          console.error("❌ Error sending DM:", error);
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
      console.log("📝 Processing message:", messageText);

      const userId = messaging.sender.id;
      const accountId = entry.id;

      const isOngoing = await hasRecentMessages(userId, accountId);
      console.log("🔄 Ongoing conversation:", isOngoing);

      let automation: Automation | null = null;
      if (!isOngoing) {
        const matcher = await matchKeyword(messageText);
        console.log("🔍 Keyword match result:", matcher);
        if (matcher?.automationId) {
          console.log("✅ Found matching automation ID:", matcher.automationId);
          automation = await getKeywordAutomation(matcher.automationId, true);
          console.log("🤖 Automation details:", automation?.id);
        }
      } else {
        const { automationId } = await getChatHistory(userId, accountId);
        if (automationId) {
          automation = await getKeywordAutomation(automationId, true);
        }
      }

      if (!automation?.User?.integrations?.[0]?.token) {
        console.log("❌ No valid integration token found");
        return NextResponse.json({ message: 'No valid integration token' }, { status: 200 });
      }

      if (automation.listener?.listener === 'MESSAGE') {
        try {
          console.log("📤 Attempting to send DM:", {
            entryId: accountId,
            senderId: userId,
            prompt: automation.listener.prompt,
          });
          const direct_message = await sendDM(
            accountId,
            userId,
            automation.listener.prompt,
            automation.User.integrations[0].token
          );
          console.log("📬 DM Response:", direct_message);
          if (direct_message.status === 200) {
            await trackResponses(automation.id, 'DM');
            console.log("✅ Message sent successfully");
            return NextResponse.json({ message: 'Message sent' }, { status: 200 });
          }
        } catch (error) {
          console.error("❌ Error sending DM:", error);
        }
      }

      if (
        automation.listener?.listener === 'SMARTAI' &&
        automation.User?.subscription?.plan === 'PRO'
      ) {
        try {
          console.log("🤖 Processing SMARTAI response");
          const { history } = await getChatHistory(userId, accountId);
          const limitedHistory = history.slice(-5);
          limitedHistory.push({ role: 'user', content: messageText });

          const smart_ai_message = await openai.chat.completions.create({
            model: 'google/gemma-3-27b-it:free',
            messages: [
              {
                role: 'system',
                content: `${automation.listener?.prompt}: Keep responses under 2 sentences`,
              },
              ...limitedHistory,
            ],
          });

          console.log("AI Response Raw:", JSON.stringify(smart_ai_message, null, 2));

          if (smart_ai_message?.choices?.[0]?.message?.content) {
            const aiResponse = smart_ai_message.choices[0].message.content;
            await createChatHistory(automation.id, userId, accountId, messageText);
            await createChatHistory(automation.id, accountId, userId, aiResponse);

            console.log("📤 Sending AI response as DM:", aiResponse);
            const direct_message = await sendDM(
              accountId,
              userId,
              aiResponse,
              automation.User.integrations[0].token
            );

            console.log("📬 DM Response:", direct_message);
            if (direct_message.status === 200) {
              await trackResponses(automation.id, 'DM');
              console.log("✅ AI response sent successfully");
              return NextResponse.json({ message: 'AI response sent' }, { status: 200 });
            } else {
              console.error("❌ DM failed with status:", direct_message.status);
              return NextResponse.json({ message: 'Failed to send AI response' }, { status: 500 });
            }
          } else {
            console.error("❌ No content in AI response:", smart_ai_message);
            return NextResponse.json({ message: 'No AI response content' }, { status: 500 });
          }
        } catch (error) {
          console.error("❌ Error in SMARTAI block:", error);
          return NextResponse.json({ message: 'Error processing AI response' }, { status: 500 });
        }
      } else {
        console.log("❌ No SMARTAI automation or insufficient subscription");
        return NextResponse.json({ message: 'No automation set' }, { status: 200 });
      }
    }

    console.log("=== WEBHOOK DEBUG END ===");
    return NextResponse.json({ message: 'No automation set' }, { status: 200 });
  } catch (error) {
    console.error("❌ Webhook Error:", error);
    return NextResponse.json({ message: 'Error processing webhook' }, { status: 500 });
  }
}

async function findAutomationByPostId(postId: string): Promise<Automation | null> {
  return client.automation.findFirst({
    where: {
      posts: {
        some: {
          postid: postId,
        },
      },
    },
    include: {
      keywords: true,
      listener: true,
      trigger: true,
      dms: true,
      User: {
        include: {
          integrations: true,
          subscription: true,
        },
      },
    },
  });
}