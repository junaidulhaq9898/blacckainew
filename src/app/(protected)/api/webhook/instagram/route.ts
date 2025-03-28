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

// Webhook verification endpoint
export async function GET(req: NextRequest) {
  const hub = req.nextUrl.searchParams.get('hub.challenge');
  return new NextResponse(hub);
}

// Main webhook handler
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

    // Handle comments
    if (entry.changes && entry.changes[0].field === 'comments') {
      const commentData = entry.changes[0].value;
      const commentText = commentData.text.toLowerCase();
      const commentId = commentData.id;
      const postId = commentData.media.id;
      const commenterId = commentData.from.id;

      console.log("📝 Processing comment:", commentText);

      // Find automation linked to the post
      const automation = await client.automation.findFirst({
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
            select: {
              subscription: {
                select: {
                  plan: true,
                },
              },
              integrations: {
                select: {
                  token: true,
                },
              },
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

      // Send comment reply if configured
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

      // Send DM after comment based on subscription plan
      if (automation.User?.subscription?.plan === 'PRO') {
        try {
          console.log("🤖 Processing AI-powered DM for PRO user");
          const { history } = await getChatHistory(commenterId, entry.id);
          const limitedHistory = history.slice(-5);
          limitedHistory.push({ role: 'user', content: commentText });

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

          if (smart_ai_message?.choices?.[0]?.message?.content) {
            const aiResponse = smart_ai_message.choices[0].message.content;
            console.log("📤 Sending AI response as DM:", aiResponse);
            const dmResponse = await sendDM(entry.id, commenterId, aiResponse, token);
            console.log("✅ DM sent successfully:", dmResponse);
            await createChatHistory(automation.id, commenterId, entry.id, commentText);
            await createChatHistory(automation.id, entry.id, commenterId, aiResponse);
            await trackResponses(automation.id, 'DM');
          } else {
            console.error("❌ No content in AI response:", smart_ai_message);
          }
        } catch (error: unknown) {
          console.error("❌ Error sending AI-powered DM:", error);
        }
      } else {
        // Free plan: send template message
        try {
          const templateMessage = `Thanks for your comment: "${commentText}"! How can we assist you today?`;
          console.log("📤 Sending template DM:", templateMessage);
          const dmResponse = await sendDM(entry.id, commenterId, templateMessage, token);
          console.log("✅ DM sent successfully:", dmResponse);
          await trackResponses(automation.id, 'DM');
        } catch (error: unknown) {
          console.error("❌ Error sending template DM:", error);
        }
      }

      console.log("✅ Comment processing completed");
      return NextResponse.json({ message: 'Comment processed' }, { status: 200 });
    }

    const messaging = entry.messaging?.[0];
    console.log("Messaging Object:", JSON.stringify(messaging, null, 2));

    // Skip if it's a read receipt or echo message
    if (messaging?.read || messaging?.message?.is_echo) {
      console.log("Skipping read receipt or echo message");
      return NextResponse.json({ message: 'Receipt processed' }, { status: 200 });
    }

    // Process actual message
    if (messaging?.message?.text) {
      const messageText = messaging.message.text;
      console.log("📝 Processing message:", messageText);

      const userId = messaging.sender.id;
      const accountId = entry.id;

      // Check if there's an ongoing conversation
      const isOngoing = await hasRecentMessages(userId, accountId);
      console.log("🔄 Ongoing conversation:", isOngoing);

      let automation;
      if (!isOngoing) {
        // New conversation: check for keyword match
        const matcher = await matchKeyword(messageText);
        console.log("🔍 Keyword match result:", matcher);

        if (matcher?.automationId) {
          console.log("✅ Found matching automation ID:", matcher.automationId);
          automation = await getKeywordAutomation(matcher.automationId, true);
          console.log("🤖 Automation details:", automation?.id);
        }
      } else {
        // Ongoing conversation: fetch the automation from history
        const { automationId } = await getChatHistory(userId, accountId);
        if (automationId) {
          automation = await getKeywordAutomation(automationId, true);
        }
      }

      if (!automation?.User?.integrations?.[0]?.token) {
        console.log("❌ No valid integration token found");
        return NextResponse.json(
          { message: 'No valid integration token' },
          { status: 200 }
        );
      }

      // Handle MESSAGE listener (non-PRO or non-SMARTAI)
      if (automation.listener?.listener === 'MESSAGE' || automation.User?.subscription?.plan !== 'PRO') {
        try {
          const messageResponse = "Hello! How can Delight Brush Industries assist you with our paint brushes today?";
          console.log("📤 Attempting to send DM:", {
            entryId: accountId,
            senderId: userId,
            message: messageResponse,
          });

          const direct_message = await sendDM(
            accountId,
            userId,
            messageResponse,
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
          return NextResponse.json(
            { message: 'Error sending message' },
            { status: 500 }
          );
        }
      }

      // Handle SMARTAI listener for PRO plan users (includes ongoing chat)
      if (automation.User?.subscription?.plan === 'PRO') {
        try {
          console.log("🤖 Processing SMARTAI response for PRO user");

          // Fetch conversation history (limit to last 5 messages for performance)
          const { history } = await getChatHistory(userId, accountId);
          const limitedHistory = history.slice(-5); // Limit to last 5 messages

          // Add the new user message to the history
          limitedHistory.push({ role: 'user', content: messageText });

          // Generate AI response with full history
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

            // Log user's message
            await createChatHistory(
              automation.id,
              userId,       // sender: user
              accountId,    // receiver: account
              messageText
            );

            // Log AI's response
            await createChatHistory(
              automation.id,
              accountId,    // sender: account
              userId,       // receiver: user
              aiResponse
            );

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
              return NextResponse.json(
                { message: 'AI response sent' },
                { status: 200 }
              );
            } else {
              console.error("❌ DM failed with status:", direct_message.status);
              return NextResponse.json(
                { message: 'Failed to send AI response' },
                { status: 500 }
              );
            }
          } else {
            console.error("❌ No content in AI response:", smart_ai_message);
            return NextResponse.json(
              { message: 'No AI response content' },
              { status: 500 }
            );
          }
        } catch (error) {
          console.error("❌ Error in SMARTAI block:", error);
          return NextResponse.json(
            { message: 'Error processing AI response' },
            { status: 500 }
          );
        }
      }
    }

    console.log("=== WEBHOOK DEBUG END ===");
    return NextResponse.json({ message: 'No automation set' }, { status: 200 });
  } catch (error) {
    console.error("❌ Webhook Error:", error);
    return NextResponse.json(
      { message: 'Error processing webhook' },
      { status: 500 }
    );
  }
}