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
import { sendDM } from '@/lib/fetch';
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
        console.log("❌ No valid integration token found"); // Fixed typo here
        return NextResponse.json(
          { message: 'No valid integration token' },
          { status: 200 }
        );
      }

      // Handle MESSAGE listener
      if (automation.listener?.listener === 'MESSAGE') {
        try {
          console.log("📤 Attempting to send DM:", {
            entryId: entry.id,
            senderId: messaging.sender.id,
            prompt: automation.listener.prompt,
          });

          const direct_message = await sendDM(
            entry.id,
            messaging.sender.id,
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
          return NextResponse.json(
            { message: 'Error sending message' },
            { status: 500 }
          );
        }
      }

      // Handle SMARTAI listener for PRO plan users
      if (
        automation.listener?.listener === 'SMARTAI' &&
        automation.User?.subscription?.plan === 'PRO'
      ) {
        try {
          console.log("🤖 Processing SMARTAI response");

          // Fetch conversation history
          const { history } = await getChatHistory(userId, accountId);

          // Add the new user message to the history
          history.push({ role: 'user', content: messageText });

          // Generate AI response with full history
          const smart_ai_message = await openai.chat.completions.create({
            model: 'deepseek/deepseek-chat:free',
            messages: [
              {
                role: 'system',
                content: `${automation.listener?.prompt}: Keep responses under 2 sentences`,
              },
              ...history,
            ],
          });

          if (smart_ai_message.choices[0].message.content) {
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

            console.log("📤 Sending AI response as DM");
            const direct_message = await sendDM(
              accountId,
              userId,
              aiResponse,
              automation.User.integrations[0].token
            );

            if (direct_message.status === 200) {
              await trackResponses(automation.id, 'DM');
              console.log("✅ AI response sent successfully");
              return NextResponse.json(
                { message: 'AI response sent' },
                { status: 200 }
              );
            }
          }
        } catch (error) {
          console.error("❌ Error processing AI response:", error);
          return NextResponse.json(
            { message: 'Error processing AI response' },
            { status: 500 }
          );
        }
      } else {
        // Handle other automation types or no automation
        console.log("❌ No SMARTAI automation or insufficient subscription");
        return NextResponse.json({ message: 'No automation set' }, { status: 200 });
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