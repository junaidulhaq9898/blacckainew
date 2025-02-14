// app/(protected)/api/webhook/instagram/route.ts

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
  try {
    const webhook_payload = await req.json()

    let matcher
    if (webhook_payload.entry[0].messaging) {
      const messageText = webhook_payload.entry[0].messaging[0]?.message?.text || ''
      if (messageText) {
        matcher = await matchKeyword(messageText)
      }
    }

    if (webhook_payload.entry[0].changes) {
      const commentText = webhook_payload.entry[0].changes[0]?.value?.text || ''
      if (commentText) {
        matcher = await matchKeyword(commentText)
      }
    }

    if (matcher?.automationId) {
      if (webhook_payload.entry[0].messaging) {
        const automation = await getKeywordAutomation(matcher.automationId, true)

        if (automation?.trigger) {
          if (automation.listener?.listener === 'MESSAGE') {
            const direct_message = await sendDM(
              webhook_payload.entry[0].id,
              webhook_payload.entry[0].messaging[0].sender.id,
              automation.listener?.prompt,
              automation.User?.integrations[0].token!
            )

            if (direct_message.status === 200) {
              await trackResponses(automation.id, 'DM')
              return NextResponse.json({ message: 'Message sent' }, { status: 200 })
            }
          }

          if (
            automation.listener?.listener === 'SMARTAI' &&
            automation.User?.subscription?.plan === 'PRO'
          ) {
            const smart_ai_message = await openai.chat.completions.create({
              model: 'gpt-4',
              messages: [
                {
                  role: 'assistant',
                  content: `${automation.listener?.prompt}: Keep responses under 2 sentences`,
                },
              ],
            })

            if (smart_ai_message.choices[0].message.content) {
              // Create chat histories
              const [reciever, sender] = await Promise.all([
                createChatHistory(
                  automation.id,
                  webhook_payload.entry[0].id,
                  webhook_payload.entry[0].messaging[0].sender.id,
                  webhook_payload.entry[0].messaging[0].message.text
                ),
                createChatHistory(
                  automation.id,
                  webhook_payload.entry[0].id,
                  webhook_payload.entry[0].messaging[0].sender.id,
                  smart_ai_message.choices[0].message.content
                )
              ])

              await client.$transaction([
                client.dms.create({ data: { ...reciever } }),
                client.dms.create({ data: { ...sender } })
              ])

              const direct_message = await sendDM(
                webhook_payload.entry[0].id,
                webhook_payload.entry[0].messaging[0].sender.id,
                smart_ai_message.choices[0].message.content,
                automation.User?.integrations[0].token!
              )

              if (direct_message.status === 200) {
                await trackResponses(automation.id, 'DM')
                return NextResponse.json({ message: 'Message sent' }, { status: 200 })
              }
            }
          }
        }
      }

      // Handle comment changes
      if (
        webhook_payload.entry[0].changes &&
        webhook_payload.entry[0].changes[0].field === 'comments'
      ) {
        const automation = await getKeywordAutomation(matcher.automationId, false)
        const automations_post = await getKeywordPost(
          webhook_payload.entry[0].changes[0].value.media.id,
          automation?.id!
        )

        if (automation && automations_post && automation.trigger) {
          // Process comment automation logic here...
        }
      }
    } else {
      // Handle no match case
      if (webhook_payload.entry[0].messaging) {
        const chatHistory = await getChatHistory(
          webhook_payload.entry[0].messaging[0].recipient.id,
          webhook_payload.entry[0].messaging[0].sender.id
        )

        if (chatHistory.history.length > 0 && chatHistory.automationId) {
          const automation = await findAutomation(chatHistory.automationId)
          
          if (
            automation?.User?.subscription?.plan === 'PRO' &&
            automation.listener?.listener === 'SMARTAI'
          ) {
            // Process SMARTAI response for existing conversation
          }
        }
      }
    }

    return NextResponse.json({ message: 'No automation set' }, { status: 200 })
  } catch (error) {
    console.error('Webhook Error:', error)
    return NextResponse.json(
      { message: 'Error processing webhook' },
      { status: 500 }
    )
  }
}