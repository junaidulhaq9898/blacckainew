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

// Universal smart fallback with improved prompt parsing
function generateSmartFallback(
  messageText: string,
  history: { role: string; content: string }[],
  prompt?: string
): string {
  const lowerText = messageText.toLowerCase();
  const lastSentMessages = history.filter(h => h.role === 'assistant').map(h => h.content);
  const lastMessage = lastSentMessages.length > 0 ? lastSentMessages[lastSentMessages.length - 1] : null;

  // Generic fallback options to cycle through
  const fallbackOptions = [
    "I’m here to assist you. Could you tell me more about what you need?",
    "Hi there! How can I help you today?",
    "I’d love to assist! What are you looking for?",
  ];

  // Cycle through fallbacks
  const getNextFallback = () => {
    if (!lastMessage || !fallbackOptions.includes(lastMessage)) return fallbackOptions[0];
    const currentIndex = fallbackOptions.indexOf(lastMessage);
    return fallbackOptions[(currentIndex + 1) % fallbackOptions.length];
  };

  // If no prompt, cycle generic responses
  if (!prompt) {
    console.log("⚠️ No prompt provided, using generic fallback");
    return getNextFallback();
  }

  // Split prompt into sentences and clean up
  const promptSentences = prompt.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 0);
  const keywords = lowerText.split(/\s+/).filter(word => word.length > 2); // e.g., "delivery", "outside", "india"

  console.log("🔍 Keywords extracted from message:", keywords);
  console.log("🔍 Prompt sentences:", promptSentences);

  // Match keywords to prompt sentences
  for (const keyword of keywords) {
    for (const sentence of promptSentences) {
      if (sentence.toLowerCase().includes(keyword)) {
        console.log("✅ Matched keyword:", keyword, "in sentence:", sentence);
        return `${sentence}. How can I assist you further?`;
      }
    }
  }

  // If no match, cycle through generic fallbacks
  console.log("⚠️ No keyword match found in prompt, using generic fallback");
  return getNextFallback();
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

      const automation = await client.automation.findFirst({
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
              integrations: { select: { token: true } },
            },
          },
        },
      });

      if (!automation) {
        console.log("❌ No automation found for post ID:", postId);
        return NextResponse.json({ message: 'No automation found' }, { status: 200 });
      }

      console.log("🔍 Automation found:", automation.id, "Plan:", automation.User?.subscription?.plan);

      const token = automation.User?.integrations?.[0]?.token;
      if (!token) {
        console.log("❌ No valid integration token found");
        return NextResponse.json({ message: 'No valid integration token' }, { status: 200 });
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

          let aiResponse: string | null = null;
          try {
            const smart_ai_message = await openai.chat.completions.create({
              model: 'google/gemma-3-27b-it:free',
              messages: [
                {
                  role: 'system',
                  content: aiPrompt,
                },
                ...limitedHistory,
              ],
            });
            aiResponse = smart_ai_message?.choices?.[0]?.message?.content || null;
          } catch (aiError) {
            console.error("❌ AI request failed (likely rate limit):", aiError);
          }

          if (aiResponse) {
            console.log("📤 Sending AI response as DM:", aiResponse);
            const dmResponse = await sendDM(entry.id, commenterId, aiResponse, token);
            console.log("✅ DM sent successfully:", dmResponse);
            await createChatHistory(automation.id, commenterId, entry.id, commentText);
            await createChatHistory(automation.id, entry.id, commenterId, aiResponse);
            console.log("✅ Chat history updated with automation ID:", automation.id);
            await trackResponses(automation.id, 'DM');
          } else {
            console.log("⚠️ AI response unavailable, using fallback");
            const fallbackResponse = generateSmartFallback(commentText, limitedHistory, automation.listener?.prompt);
            console.log("📤 Sending smart fallback DM:", fallbackResponse);
            const dmResponse = await sendDM(entry.id, commenterId, fallbackResponse, token);
            console.log("✅ Fallback DM sent successfully:", dmResponse);
            await createChatHistory(automation.id, commenterId, entry.id, commentText);
            await createChatHistory(automation.id, entry.id, commenterId, fallbackResponse);
            await trackResponses(automation.id, 'DM');
          }
        } catch (error) {
          console.error("❌ Error sending AI-powered DM:", error);
          const { history } = await getChatHistory(commenterId, entry.id);
          const limitedHistory = history.slice(-5);
          const fallbackResponse = generateSmartFallback(commentText, limitedHistory, automation.listener?.prompt);
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

      let automation;
      if (isOngoing && automationId) {
        automation = await getKeywordAutomation(automationId, true);
        console.log("🤖 Continuing with ongoing automation:", automation?.id);
      } else {
        const matcher = await matchKeyword(messageText);
        console.log("🔍 Keyword match result:", matcher);
        if (matcher?.automationId) {
          automation = await getKeywordAutomation(matcher.automationId, true);
          console.log("🤖 Starting or restarting automation via keyword:", automation?.id);
        } else {
          const recentAutomation = await client.automation.findFirst({
            where: {
              dms: {
                some: {
                  OR: [
                    { senderId: userId, reciever: accountId },
                    { senderId: accountId, reciever: userId },
                  ],
                },
              },
            },
            include: {
              User: {
                select: {
                  subscription: { select: { plan: true } },
                  integrations: { select: { token: true } },
                },
              },
              listener: true,
            },
            orderBy: { createdAt: 'desc' },
          });
          if (recentAutomation) {
            automation = recentAutomation;
            console.log("🤖 Recovered automation from recent DMs:", automation.id);
          } else {
            console.log("❌ No keyword match and no recoverable automation");
            return NextResponse.json({ message: 'No automation found' }, { status: 200 });
          }
        }
      }

      if (!automation) {
        console.log("❌ Automation fetch failed");
        return NextResponse.json({ message: 'Automation fetch failed' }, { status: 200 });
      }

      console.log("🔍 Automation plan:", automation.User?.subscription?.plan);
      console.log("🔍 Automation prompt:", automation.listener?.prompt);

      const token = automation.User?.integrations?.[0]?.token;
      if (!token) {
        console.log("❌ No valid integration token found");
        return NextResponse.json({ message: 'No valid integration token' }, { status: 200 });
      }

      if (automation.User?.subscription?.plan === 'PRO') {
        try {
          console.log("🤖 Generating AI-powered response for PRO user");
          const limitedHistory = history.slice(-5);
          limitedHistory.push({ role: 'user', content: messageText });

          const aiPrompt = automation.listener?.listener === 'SMARTAI' && automation.listener?.prompt
            ? automation.listener.prompt
            : "You are a customer service assistant. Answer the user’s question concisely in 1-2 sentences based on general product inquiries.";

          let aiResponse: string | null = null;
          try {
            const smart_ai_message = await openai.chat.completions.create({
              model: 'google/gemma-3-27b-it:free',
              messages: [
                {
                  role: 'system',
                  content: aiPrompt,
                },
                ...limitedHistory,
              ],
            });
            aiResponse = smart_ai_message?.choices?.[0]?.message?.content || null;
          } catch (aiError) {
            console.error("❌ AI request failed (likely rate limit):", aiError);
          }

          if (aiResponse) {
            console.log("📤 Sending AI response as DM:", aiResponse);
            const direct_message = await sendDM(accountId, userId, aiResponse, token);
            console.log("📬 DM Response:", direct_message);

            if (direct_message.status === 200) {
              await createChatHistory(automation.id, userId, accountId, messageText);
              await createChatHistory(automation.id, accountId, userId, aiResponse);
              console.log("✅ Chat history updated with automation ID:", automation.id);
              await trackResponses(automation.id, 'DM');
              console.log("✅ AI response sent successfully");
              return NextResponse.json({ message: 'AI response sent' }, { status: 200 });
            } else {
              console.error("❌ DM failed with status:", direct_message.status);
              throw new Error('DM send failed');
            }
          } else {
            console.log("⚠️ AI response unavailable, using fallback");
            const fallbackResponse = generateSmartFallback(messageText, limitedHistory, automation.listener?.prompt);
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
          const limitedHistory = history.slice(-5);
          const fallbackResponse = generateSmartFallback(messageText, limitedHistory, automation.listener?.prompt);
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