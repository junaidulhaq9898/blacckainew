'use server'

import { findAutomation, updateAutomation } from '@/actions/automations/queries'
import {
  createChatHistory,
  getChatHistory,
  getKeywordAutomation,
  getKeywordPost,
  matchKeyword,
  trackResponses,
} from '@/actions/webhook/queries'
import { sendDM, sendPrivateMessage } from '@/lib/fetch'
import { openai } from '@/lib/openai'
import { client } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

// Endpoint to validate webhook from Instagram
export async function GET(req: NextRequest) {
  const hub = req.nextUrl.searchParams.get('hub.challenge')
  return new NextResponse(hub)
}

export async function POST(req: NextRequest) {
  const webhook_payload = await req.json()

  // Log the webhook payload to check if it's correct
  console.log("Webhook Payload:", JSON.stringify(webhook_payload, null, 2));

  let matcher
  try {
    // Check if messaging is available and match the keyword
    if (webhook_payload.entry[0].messaging) {
      console.log("Messaging Found:", webhook_payload.entry[0].messaging);

      // Check if the message is an echo message (Instagram often sends echoes of sent messages)
      const message = webhook_payload.entry[0].messaging[0]?.message;
      if (message?.is_echo) {
        console.log("Skipping echo message.");
        return NextResponse.json({ message: 'Echo message received, skipping.' }, { status: 200 });
      }

      // Check if the message contains valid text
      if (message?.text) {
        matcher = await matchKeyword(message.text);  // Match the keyword in the message text
        console.log("Keyword match result (messaging):", matcher);
      } else {
        console.log("No valid text in message.");
      }
    }

    // Check if changes are available and match the keyword
    if (webhook_payload.entry[0].changes) {
      console.log("Changes Found:", webhook_payload.entry[0].changes);
      const commentText = webhook_payload.entry[0].changes[0]?.value?.text || '';

      if (commentText) {
        matcher = await matchKeyword(commentText);
        console.log("Keyword match result (changes):", matcher);  // Log the match result
      } else {
        console.log("No comment text found for keyword matching.");
      }
    }

    // If matcher is found, proceed with automation logic
    if (matcher && matcher.automationId) {
      console.log('Matched automationId:', matcher.automationId);  // Log when automationId is matched

      const automation = await findAutomation(matcher.automationId);
      if (!automation) {
        console.log('No automation found for automationId:', matcher.automationId);
        return NextResponse.json({ message: 'No automation found' }, { status: 404 });
      }
      console.log("Retrieved automation:", automation);  // Log the retrieved automation

      // Check if the automation is active
      if (!automation.active) {
        console.log('Automation is not active, activating it now.');
        // Update the automation status to active
        await updateAutomation(automation.id, { active: true });
      }

      if (automation && automation.trigger) {
        // Handling MESSAGE listener
        if (automation.listener && automation.listener.listener === 'MESSAGE') {
          const direct_message = await sendDM(
            webhook_payload.entry[0].id,
            webhook_payload.entry[0].messaging[0].sender.id,
            automation.listener?.prompt,
            automation.User?.integrations[0].token!
          )

          if (direct_message.status === 200) {
            const tracked = await trackResponses(automation.id, 'DM')
            if (tracked) {
              return NextResponse.json(
                { message: 'Message sent' },
                { status: 200 }
              )
            }
          }
        }

        // Handle SMARTAI listener
        if (
          automation.listener &&
          automation.listener.listener === 'SMARTAI' &&
          automation.User?.subscription?.plan === 'PRO'
        ) {
          const smart_ai_message = await openai.chat.completions.create({
            model: 'gpt-4o',
            messages: [
              {
                role: 'assistant',
                content: `${automation.listener?.prompt}: Keep responses under 2 sentences`,
              },
            ],
          })

          console.log("Smart AI message response:", smart_ai_message);

          if (smart_ai_message.choices[0].message.content) {
            const reciever = createChatHistory(
              automation.id,
              webhook_payload.entry[0].id,
              webhook_payload.entry[0].messaging[0].sender.id,
              webhook_payload.entry[0].messaging[0].message.text
            )

            const sender = createChatHistory(
              automation.id,
              webhook_payload.entry[0].id,
              webhook_payload.entry[0].messaging[0].sender.id,
              smart_ai_message.choices[0].message.content
            )

            await client.$transaction([reciever, sender])

            const direct_message = await sendDM(
              webhook_payload.entry[0].id,
              webhook_payload.entry[0].messaging[0].sender.id,
              smart_ai_message.choices[0].message.content,
              automation.User?.integrations[0].token!
            )

            if (direct_message.status === 200) {
              const tracked = await trackResponses(automation.id, 'DM')
              if (tracked) {
                return NextResponse.json(
                  { message: 'Message sent' },
                  { status: 200 }
                )
              }
            }
          }
        }
      }
    } else {
      console.log('No automationId found or keyword match failed.');  // Log when no automationId is found

      // If no match is found, try looking up customer history and matching automation
      const customer_history = await getChatHistory(
        webhook_payload.entry[0].messaging[0].recipient.id,
        webhook_payload.entry[0].messaging[0].sender.id
      )

      console.log('Customer history:', customer_history);

      if (customer_history.history.length > 0) {
        const automation = await findAutomation(customer_history.automationId!)

        if (
          automation?.User?.subscription?.plan === 'PRO' &&
          automation.listener?.listener === 'SMARTAI'
        ) {
          const smart_ai_message = await openai.chat.completions.create({
            model: 'gpt-4o',
            messages: [
              {
                role: 'assistant',
                content: `${automation.listener?.prompt}: keep responses under 2 sentences`,
              },
              ...customer_history.history,
              {
                role: 'user',
                content: webhook_payload.entry[0].messaging[0].message.text,
              },
            ],
          })

          if (smart_ai_message.choices[0].message.content) {
            const reciever = createChatHistory(
              automation.id,
              webhook_payload.entry[0].id,
              webhook_payload.entry[0].messaging[0].sender.id,
              webhook_payload.entry[0].messaging[0].message.text
            )

            const sender = createChatHistory(
              automation.id,
              webhook_payload.entry[0].id,
              webhook_payload.entry[0].messaging[0].sender.id,
              smart_ai_message.choices[0].message.content
            )
            await client.$transaction([reciever, sender])
            const direct_message = await sendDM(
              webhook_payload.entry[0].id,
              webhook_payload.entry[0].messaging[0].sender.id,
              smart_ai_message.choices[0].message.content,
              automation.User?.integrations[0].token!
            )

            if (direct_message.status === 200) {
              return NextResponse.json(
                { message: 'Message sent' },
                { status: 200 }
              )
            }
          }
        }
      }

      return NextResponse.json(
        {
          message: 'No automation set',
        },
        { status: 200 }
      )
    }

    return NextResponse.json(
      {
        message: 'No automation set',
      },
      { status: 200 }
    )
  } catch (error) {
    console.error("Error:", error); // Log the error for debugging
    return NextResponse.json(
      {
        message: 'Error occurred during automation process',
      },
      { status: 500 }
    )
  }
}
