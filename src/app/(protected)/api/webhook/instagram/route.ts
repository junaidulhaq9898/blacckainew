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

export async function GET(req: NextRequest) {
  const hub = req.nextUrl.searchParams.get('hub.challenge')
  return new NextResponse(hub)
}

export async function POST(req: NextRequest) {
  const webhook_payload = await req.json()

  // Log the webhook payload to check if it's correct
  console.log("Webhook Payload:", webhook_payload);

  let matcher
  try {
    // Check if messaging is available and match the keyword
    if (webhook_payload.entry[0].messaging) {
      matcher = await matchKeyword(
        webhook_payload.entry[0].messaging[0].message.text
      )
      console.log("Keyword match result (messaging):", matcher);  // Log the match result
    }

    // Check if changes are available and match the keyword
    if (webhook_payload.entry[0].changes) {
      matcher = await matchKeyword(
        webhook_payload.entry[0].changes[0].value.text
      )
      console.log("Keyword match result (changes):", matcher);  // Log the match result
    }

    if (matcher && matcher.automationId) {
      console.log('Matched automationId:', matcher.automationId);  // Log when automationId is matched

      // If messaging is available, handle the automation logic
      if (webhook_payload.entry[0].messaging) {
        const automation = await getKeywordAutomation(
          matcher.automationId,
          true
        )
        console.log("Retrieved automation:", automation);  // Log the retrieved automation

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

          // Handling SMARTAI listener
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
      }

      // Handle changes if the field is 'comments'
      if (
        webhook_payload.entry[0].changes &&
        webhook_payload.entry[0].changes[0].field === 'comments'
      ) {
        const automation = await getKeywordAutomation(
          matcher.automationId,
          false
        )

        console.log('Getting the automations for comments');

        const automations_post = await getKeywordPost(
          webhook_payload.entry[0].changes[0].value.media.id,
          automation?.id!
        )

        console.log('Found keyword:', automations_post);

        if (automation && automations_post && automation.trigger) {
          // Handling MESSAGE listener for comments
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
                  return NextResponse.json(
                    { message: 'Message sent' },
                    { status: 200 }
                  )
                }
              }
            }

            // Handling SMARTAI listener for comments
            if (
              automation.listener.listener === 'SMARTAI' &&
              automation.User?.subscription?.plan === 'PRO'
            ) {
              const smart_ai_message = await openai.chat.completions.create({
                model: 'gpt-4o',
                messages: [
                  {
                    role: 'assistant',
                    content: `${automation.listener?.prompt}: keep responses under 2 sentences`,
                  },
                ],
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
                    return NextResponse.json(
                      { message: 'Message sent' },
                      { status: 200 }
                    )
                  }
                }
              }
            }
          }
        }
      }
    }

    // If no match is found, try looking up customer history and matching automation
    if (!matcher) {
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
