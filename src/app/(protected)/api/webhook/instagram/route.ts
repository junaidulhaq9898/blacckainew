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
import axios from 'axios';
import { Prisma } from '@prisma/client';

// Define the expected type for automation
type AutomationWithRelations = Prisma.AutomationGetPayload<{
  include: {
    listener: true;
    User: {
      select: {
        subscription: { select: { plan: true } };
        integrations: { select: { token: true; instagramId: true } };
      };
    };
  };
}>;

// Webhook verification endpoint
export async function GET(req: NextRequest) {
  const hub = req.nextUrl.searchParams.get('hub.challenge');
  return new NextResponse(hub);
}

// Dynamic fallback (unchanged)
function generateSmartFallback(messageText: string): string {
  const lowerText = messageText.toLowerCase();
  if (lowerText.includes('shipping') || lowerText.includes('usa')) {
    return "Yes, we ship to the USA with standard rates starting at $5. What product are you interested in ordering?";
  } else if (lowerText.includes('color') || lowerText.includes('colour')) {
    return "We offer various colors for our products. Which color would you like?";
  } else if (lowerText.includes('size') || lowerText.includes('type')) {
    return "We offer multiple sizes and types. What specific size or type are you looking for?";
  } else if (lowerText.includes('price') || lowerText.includes('cost')) {
    return "Prices vary by product. What are you interested in?";
  } else if (lowerText.includes('hello') || lowerText.includes('hi')) {
    return "Hi there! How can I assist you today?";
  } else {
    return "I’m here to assist with your needs. Could you tell me more about what you’re looking for?";
  }
}

// Validate token with Instagram API
async function validateToken(token: string, accountId: string): Promise<boolean> {
  try {
    const response = await axios.get(`https://graph.instagram.com/me?fields=id&access_token=${token}`);
    console.log("✅ Token test response:", JSON.stringify(response.data));
    if (response.data.id === accountId) {
      console.log("✅ Token matches account ID:", accountId);
      return true;
    } else {
      console.log("❌ Token valid but ID mismatch. Expected:", accountId, "Got:", response.data.id);
      return false;
    }
  } catch (error: any) {
    console.error("❌ Token validation failed:", error.response?.data?.error?.message || error.message);
    return false;
  }
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

      let automation: AutomationWithRelations | null = await client.automation.findFirst({
        where: {
          posts: {
            some: {
              postid: postId,
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

      if (!automation) {
        console.log("⚠️ No automation found for post ID:", postId, "Checking instagramId...");
        automation = await client.automation.findFirst({
          where: {
            User: {
              integrations: {
                some: { instagramId: entry.id },
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

        if (!automation) {
          console.log("⚠️ No automation for instagramId, creating one...");
          const integration = await client.integrations.findFirst({
            where: { instagramId: entry.id },
            select: { userId: true, token: true, instagramId: true },
          });
          if (!integration || !integration.userId) {
            console.log("❌ No integration found for account ID:", entry.id);
            return NextResponse.json({ message: 'No integration found' }, { status: 200 });
          }

          automation = await client.automation.create({
            data: {
              userId: integration.userId,
              listener: {
                create: {
                  prompt: "Default prompt",
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

      console.log("🔍 Automation found:", automation.id, "User ID:", automation.userId, "Integrations:", JSON.stringify(automation.User?.integrations));

      let token = automation.User?.integrations?.find((i) => i.instagramId === entry.id)?.token;
      if (!token) {
        console.log("⚠️ No token in automation integrations, checking Integrations table...");
        const integration = await client.integrations.findFirst({
          where: { instagramId: entry.id },
          select: { userId: true, token: true, instagramId: true },
        });
        console.log("🔍 Integration lookup:", JSON.stringify(integration));
        token = integration?.token;
      }

      if (!token) {
        console.log("❌ No valid integration token found");
        return NextResponse.json({ message: 'No valid integration token' }, { status: 200 });
      }

      const isTokenValid = await validateToken(token, entry.id);
      if (!isTokenValid) {
        console.log("❌ Token invalid - please refresh Instagram access token");
        return NextResponse.json({ message: 'Invalid token' }, { status: 401 });
      }

      if (automation.listener?.commentReply) {
        try {
          console.log("📤 Sending comment reply:", automation.listener.commentReply);
          const replyResponse = await sendCommentReply(commentId, automation.listener.commentReply, token);
          console.log("✅ Comment reply sent successfully:", replyResponse);
          await trackResponses(automation.id, 'COMMENT');
        } catch (error: unknown) {
          console.error("❌ Error sending comment reply:", error);
        }
      } else {
        console.log("⚠️ No comment reply defined in listener; skipping comment reply");
      }

      if (automation.User?.subscription?.plan === 'PRO') {
        try {
          console.log("🤖 Generating AI-powered DM for PRO user");
          const { history } = await getChatHistory(commenterId, entry.id);
          const limitedHistory = history.slice(-5);
          limitedHistory.push({ role: 'user', content: commentText });

          const aiPrompt = automation.listener?.listener === 'SMARTAI' && automation.listener?.prompt
            ? automation.listener.prompt
            : "You are a customer service assistant. Answer the user’s question concisely in 1-2 sentences based on general product inquiries.";

          const smart_ai_message = await openai.chat.completions.create({
            model: 'google/gemma-3-27b-it:free',
            messages: [
              { role: 'system', content: aiPrompt },
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
            const fallbackResponse = generateSmartFallback(commentText);
            console.log("📤 Sending smart fallback DM:", fallbackResponse);
            const dmResponse = await sendDM(entry.id, commenterId, fallbackResponse, token);
            console.log("✅ Fallback DM sent successfully:", dmResponse);
            await createChatHistory(automation.id, commenterId, entry.id, commentText);
            await createChatHistory(automation.id, entry.id, commenterId, fallbackResponse);
            await trackResponses(automation.id, 'DM');
          }
        } catch (error) {
          console.error("❌ Error sending AI-powered DM:", error);
          const fallbackResponse = generateSmartFallback(commentText);
          console.log("📤 Sending smart fallback DM:", fallbackResponse);
          const dmResponse = await sendDM(entry.id, commenterId, fallbackResponse, token);
          console.log("✅ Fallback DM sent successfully:", dmResponse);
          await createChatHistory(automation.id, commenterId, entry.id, commentText);
          await createChatHistory(automation.id, entry.id, commenterId, fallbackResponse);
          await trackResponses(automation.id, 'DM');
        }
      } else {
        try {
          const templateMessage = `Thanks for your comment: "${commentText}"! How can we assist you today?`;
          console.log("📤 Sending template DM for non-PRO user:", templateMessage);
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

    if (messaging?.read || messaging?.message?.is_echo) {
      console.log("Skipping read receipt or echo message");
      return NextResponse.json({ message: 'Receipt processed' }, { status: 200 });
    }

    if (messaging?.message?.text) {
      const messageText = messaging.message.text;
      console.log("📝 Processing message:", messageText);

      const userId = messaging.sender.id;
      const accountId = entry.id;

      const { history, automationId } = await getChatHistory(userId, accountId);
      const isOngoing = history.length > 0;
      console.log("🔄 Ongoing conversation check:", isOngoing, "History length:", history.length, "Automation ID from history:", automationId);

      let automation: AutomationWithRelations | null;
      if (isOngoing && automationId) {
        automation = await getKeywordAutomation(automationId, true) as AutomationWithRelations;
        console.log("🤖 Continuing with ongoing automation:", automation?.id);
      } else {
        const matcher = await matchKeyword(messageText);
        console.log("🔍 Keyword match result:", matcher);
        if (matcher?.automationId) {
          automation = await getKeywordAutomation(matcher.automationId, true) as AutomationWithRelations;
          console.log("🤖 Starting or restarting automation via keyword:", automation?.id);
        } else {
          automation = await client.automation.findFirst({
            where: {
              User: {
                integrations: {
                  some: { instagramId: accountId },
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

          if (!automation) {
            console.log("⚠️ No automation for instagramId, creating one...");
            const integration = await client.integrations.findFirst({
              where: { instagramId: accountId },
              select: { userId: true, token: true, instagramId: true },
            });
            if (!integration || !integration.userId) {
              console.log("❌ No integration found for account ID:", accountId);
              return NextResponse.json({ message: 'No integration found' }, { status: 200 });
            }

            automation = await client.automation.create({
              data: {
                userId: integration.userId,
                listener: {
                  create: {
                    prompt: "Default prompt",
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
      }

      if (!automation) {
        console.log("❌ Automation fetch failed");
        return NextResponse.json({ message: 'Automation fetch failed' }, { status: 200 });
      }

      console.log("🔍 Automation found:", automation.id, "User ID:", automation.userId, "Integrations:", JSON.stringify(automation.User?.integrations));

      let token = automation.User?.integrations?.find((i) => i.instagramId === accountId)?.token;
      if (!token) {
        console.log("⚠️ No token in automation integrations, checking Integrations table...");
        const integration = await client.integrations.findFirst({
          where: { instagramId: accountId },
          select: { userId: true, token: true, instagramId: true },
        });
        console.log("🔍 Integration lookup:", JSON.stringify(integration));
        token = integration?.token;
      }

      if (!token) {
        console.log("❌ No valid integration token found");
        return NextResponse.json({ message: 'No valid integration token' }, { status: 200 });
      }

      const isTokenValid = await validateToken(token, accountId);
      if (!isTokenValid) {
        console.log("❌ Token invalid - please refresh Instagram access token");
        return NextResponse.json({ message: 'Invalid token' }, { status: 401 });
      }

      if (automation.User?.subscription?.plan === 'PRO') {
        try {
          console.log("🤖 Generating AI-powered response for PRO user");
          const limitedHistory = history.slice(-5);
          limitedHistory.push({ role: 'user', content: messageText });

          const aiPrompt = automation.listener?.listener === 'SMARTAI' && automation.listener?.prompt
            ? automation.listener.prompt
            : "You are a customer service assistant. Answer the user’s question concisely in 1-2 sentences based on general product inquiries.";

          const smart_ai_message = await openai.chat.completions.create({
            model: 'google/gemma-3-27b-it:free',
            messages: [
              { role: 'system', content: aiPrompt },
              ...limitedHistory,
            ],
          });

          if (smart_ai_message?.choices?.[0]?.message?.content) {
            const aiResponse = smart_ai_message.choices[0].message.content;

            await createChatHistory(automation.id, userId, accountId, messageText);
            await createChatHistory(automation.id, accountId, userId, aiResponse);
            console.log("✅ Chat history updated with automation ID:", automation.id);

            console.log("📤 Sending AI response as DM:", aiResponse);
            const direct_message = await sendDM(accountId, userId, aiResponse, token);

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
            const fallbackResponse = generateSmartFallback(messageText);
            console.log("📤 Sending smart fallback DM:", fallbackResponse);
            const direct_message = await sendDM(accountId, userId, fallbackResponse, token);
            console.log("✅ Fallback DM sent successfully:", direct_message);
            await createChatHistory(automation.id, userId, accountId, messageText);
            await createChatHistory(automation.id, accountId, userId, fallbackResponse);
            await trackResponses(automation.id, 'DM');
            return NextResponse.json({ message: 'Fallback response sent' }, { status: 200 });
          }
        } catch (error) {
          console.error("❌ Error in AI-powered block:", error);
          const fallbackResponse = generateSmartFallback(messageText);
          console.log("📤 Sending smart fallback DM:", fallbackResponse);
          const direct_message = await sendDM(accountId, userId, fallbackResponse, token);
          console.log("✅ Fallback DM sent successfully:", direct_message);
          await createChatHistory(automation.id, userId, accountId, messageText);
          await createChatHistory(automation.id, accountId, userId, fallbackResponse);
          await trackResponses(automation.id, 'DM');
          return NextResponse.json({ message: 'Fallback response sent' }, { status: 200 });
        }
      } else {
        if (!isOngoing) {
          try {
            const messageResponse = "Hello! How can we assist you with our products today?";
            console.log("📤 Sending static DM for non-PRO user:", {
              entryId: accountId,
              senderId: userId,
              message: messageResponse,
            });

            const direct_message = await sendDM(accountId, userId, messageResponse, token);

            console.log("📬 DM Response:", direct_message);

            if (direct_message.status === 200) {
              await trackResponses(automation.id, 'DM');
              console.log("✅ Message sent successfully");
              return NextResponse.json({ message: 'Message sent' }, { status: 200 });
            }
          } catch (error) {
            console.error("❌ Error sending DM:", error);
            return NextResponse.json({ message: 'Error sending message' }, { status: 500 });
          }
        } else {
          console.log("❌ Non-PRO user follow-up ignored");
          return NextResponse.json({ message: 'No response for follow-up' }, { status: 200 });
        }
      }
    }

    console.log("=== WEBHOOK DEBUG END ===");
    return NextResponse.json({ message: 'No automation set' }, { status: 200 });
  } catch (error) {
    console.error("❌ Webhook Error:", error);
    return NextResponse.json({ message: 'Error processing webhook' }, { status: 500 });
  }
}