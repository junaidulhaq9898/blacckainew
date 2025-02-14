import { findAutomation } from '@/actions/automations/queries'
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
  console.log("Webhook Payload:", JSON.stringify(webhook_payload, null, 2));  // Log webhook data for debugging
  
  let matcher
  try {
    // Match keyword from message text
    if (webhook_payload.entry[0].messaging) {
      console.log("Messaging Found:", webhook_payload.entry[0].messaging);
      matcher = await matchKeyword(
        webhook_payload.entry[0].messaging[0].message.text
      )
      console.log("Keyword match result (messaging):", matcher);  // Log matcher result
    }

    // Match keyword from changes if applicable
    if (webhook_payload.entry[0].changes) {
      console.log("Changes Found:", webhook_payload.entry[0].changes);
      matcher = await matchKeyword(
        webhook_payload.entry[0].changes[0].value.text
      )
      console.log("Keyword match result (changes):", matcher);  // Log matcher result
    }

    // If a match is found, proceed with automation
    if (matcher && matcher.automationId) {
      console.log('Matched automationId:', matcher.automationId);  // Log when automationId is matched

      // Check if automation is triggered for messaging
      if (webhook_payload.entry[0].messaging) {
        const automation = await getKeywordAutomation(matcher.automationId, true)
        console.log("Retrieved automation:", automation);  // Log automation details

        if (automation && automation.trigger) {
          // Handle message listener
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
                return NextResponse.json({ message: 'Message sent' }, { status: 200 })
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
              messages: [{ role: 'assistant', content: `${automation.listener?.prompt}: Keep responses under 2 sentences` }],
            })

            console.log("Smart AI message response:", smart_ai_message);  // Log AI message response

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
                  return NextResponse.json({ message: 'Message sent' }, { status: 200 })
                }
              }
            }
          }
        }
      }

      // Handle comments if applicable
      if (webhook_payload.entry[0].changes && webhook_payload.entry[0].changes[0].field === 'comments') {
        const automation = await getKeywordAutomation(matcher.automationId, false)
        console.log('Getting the automations for comments');

        const automations_post = await getKeywordPost(
          webhook_payload.entry[0].changes[0].value.media.id,
          automation?.id!
        )

        console.log('Found keyword:', automations_post);

        if (automation && automations_post && automation.trigger) {
          // Handle message listener for comments
          if (automation.listener) {
            if (automation.listener.listener === 'MESSAGE') {
              const direct_message = await sendPrivateMessage(
                webhook_payload.entry[0].id,
                webhook_payload.entry[0].changes[0].value.id,
                automation.listener?.prompt,
                automation.User?.integrations[0].token!
              )

              if (direct_message.status === 200) {
                const tracked = await trackResponses(automation.id, 'COMMENT')

                if (tracked) {
                  return NextResponse.json({ message: 'Message sent' }, { status: 200 })
                }
              }
            }

            // Handle SMARTAI listener for comments
            if (
              automation.listener.listener === 'SMARTAI' &&
              automation.User?.subscription?.plan === 'PRO'
            ) {
              const smart_ai_message = await openai.chat.completions.create({
                model: 'gpt-4o',
                messages: [{ role: 'assistant', content: `${automation.listener?.prompt}: keep responses under 2 sentences` }],
              })

              if (smart_ai_message.choices[0].message.content) {
                const reciever = createChatHistory(
                  automation.id,
                  webhook_payload.entry[0].id,
                  webhook_payload.entry[0].changes[0].value.from.id,
                  webhook_payload.entry[0].changes[0].value.text
                )

                const sender = createChatHistory(
                  automation.id,
                  webhook_payload.entry[0].id,
                  webhook_payload.entry[0].changes[0].value.from.id,
                  smart_ai_message.choices[0].message.content
                )

                await client.$transaction([reciever, sender])

                const direct_message = await sendPrivateMessage(
                  webhook_payload.entry[0].id,
                  webhook_payload.entry[0].changes[0].value.id,
                  automation.listener?.prompt,
                  automation.User?.integrations[0].token!
                )

                if (direct_message.status === 200) {
                  const tracked = await trackResponses(automation.id, 'COMMENT')

                  if (tracked) {
                    return NextResponse.json({ message: 'Message sent' }, { status: 200 })
                  }
                }
              }
            }
          }
        }
      }
    } else {
      console.log('No automationId found or keyword match failed.');  // Log when no automationId is found

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
              { role: 'assistant', content: `${automation.listener?.prompt}: keep responses under 2 sentences` },
              ...customer_history.history,
              { role: 'user', content: webhook_payload.entry[0].messaging[0].message.text },
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
              webhook_payload.entry[0].messaging[0].message.text // Add the missing comma
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
