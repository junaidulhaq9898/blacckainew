// app/api/webhook/instagram/route.ts
import { normalizeInstagramId } from '@/lib/normalizeInstagramId';
import { findAutomation } from '@/actions/automations/queries';
import {
  createChatHistory,
  getChatHistory,
  getKeywordAutomation,
  matchKeyword,
  trackResponses,
} from '@/actions/webhook/queries';
import { sendDM, sendPrivateMessage } from '@/lib/fetch';
import { openai } from '@/lib/openai';
import { client } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const hub = req.nextUrl.searchParams.get('hub.challenge');
  return new NextResponse(hub);
}

export async function POST(req: NextRequest) {
  try {
    const webhook_payload = await req.json();
    console.log("Webhook Payload:", JSON.stringify(webhook_payload, null, 2));

    let matcher;
    const entry = webhook_payload.entry?.[0];

    if (!entry) {
      console.log("No entry in webhook payload");
      return NextResponse.json({ message: 'No entry found' }, { status: 200 });
    }

    // Handle messaging events
    if (entry.messaging && Array.isArray(entry.messaging)) {
      const messaging = entry.messaging[0];
      
      // Skip if it's just a read receipt
      if (messaging.read && !messaging.message) {
        console.log("Skipping read receipt");
        return NextResponse.json({ message: 'Read receipt processed' }, { status: 200 });
      }

      // Process actual message
      if (messaging.message?.text) {
        const messageText = messaging.message.text;
        console.log("Processing message:", messageText);

        // Normalize Instagram ID
        const normalizedInstagramId = normalizeInstagramId(messaging.sender.id);

        // Use normalized ID to match the keyword
        matcher = await matchKeyword(messageText);
        console.log("Keyword match result:", matcher);

        if (matcher?.automationId) {
          const automation = await getKeywordAutomation(matcher.automationId, true);
          console.log("Found automation:", automation?.id);

          if (!automation?.User?.integrations?.[0]?.token) {
            console.log("No valid integration token found");
            return NextResponse.json(
              { message: 'No valid integration token' },
              { status: 200 }
            );
          }

          // Handle MESSAGE listener
          if (automation.listener?.listener === 'MESSAGE') {
            try {
              const direct_message = await sendDM(
                entry.id,
                normalizedInstagramId,
                automation.listener.prompt,
                automation.User.integrations[0].token
              );

              if (direct_message.status === 200) {
                await trackResponses(automation.id, 'DM');
                return NextResponse.json({ message: 'Message sent' }, { status: 200 });
              }
            } catch (error) {
              console.error("Error sending DM:", error);
              return NextResponse.json(
                { message: 'Error sending message' },
                { status: 500 }
              );
            }
          }

          // Handle SMARTAI listener
          if (
            automation.listener?.listener === 'SMARTAI' &&
            automation.User?.subscription?.plan === 'PRO'
          ) {
            try {
              const smart_ai_message = await openai.chat.completions.create({
                model: 'gpt-4',
                messages: [
                  {
                    role: 'system',
                    content: `${automation.listener?.prompt}: Keep responses under 2 sentences`
                  },
                  {
                    role: 'user',
                    content: messageText
                  }
                ]
              });

              if (smart_ai_message.choices[0].message.content) {
                const reciever = await createChatHistory(
                  automation.id,
                  entry.id,
                  normalizedInstagramId,
                  messageText
                );

                const sender = await createChatHistory(
                  automation.id,
                  entry.id,
                  normalizedInstagramId,
                  smart_ai_message.choices[0].message.content
                );

                await client.$transaction([
                  client.dms.create({ data: reciever }),
                  client.dms.create({ data: sender })
                ]);

                const direct_message = await sendDM(
                  entry.id,
                  normalizedInstagramId,
                  smart_ai_message.choices[0].message.content,
                  automation.User.integrations[0].token
                );

                if (direct_message.status === 200) {
                  await trackResponses(automation.id, 'DM');
                  return NextResponse.json(
                    { message: 'AI response sent' },
                    { status: 200 }
                  );
                }
              }
            } catch (error) {
              console.error("Error processing AI response:", error);
              return NextResponse.json(
                { message: 'Error processing AI response' },
                { status: 500 }
              );
            }
          }
        }
      }
    }

    return NextResponse.json({ message: 'No automation set' }, { status: 200 });
  } catch (error) {
    console.error("Webhook Error:", error);
    return NextResponse.json(
      { message: 'Error processing webhook' },
      { status: 500 }
    );
  }
}
