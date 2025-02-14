// app/api/webhook/instagram/route.ts

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
import { webhookLogger } from '@/lib/webhook-logger'
import { webhookValidator } from '@/lib/webhook-validator'
import { ChatCompletionMessageParam } from 'openai/resources/chat/completions'

export async function GET(req: NextRequest) {
  webhookLogger.logRequest(req, 'verification')
  const hubChallenge = req.nextUrl.searchParams.get('hub.challenge')
  return new NextResponse(hubChallenge)
}

export async function POST(req: NextRequest) {
  try {
    webhookLogger.logRequest(req, 'webhook')
    const webhook_payload = await req.json()
    
    if (!webhookValidator.validatePayload(webhook_payload)) {
      webhookLogger.logError('Invalid payload structure', webhook_payload)
      return NextResponse.json(
        { message: 'Invalid payload structure' },
        { status: 400 }
      )
    }

    let matcher
    const entry = webhook_payload.entry[0]

    if (entry.messaging) {
      const messageText = entry.messaging[0]?.message?.text || ''
      
      if (messageText) {
        matcher = await matchKeyword(messageText)
        webhookLogger.logInfo('Keyword match result', { matcher })
      }

      if (matcher?.automationId) {
        const automation = await getKeywordAutomation(matcher.automationId, true)

        if (automation?.trigger) {
          if (automation.listener?.listener === 'MESSAGE') {
            const direct_message = await sendDM(
              entry.id,
              entry.messaging[0].sender.id,
              automation.listener.prompt,
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
            const messages: ChatCompletionMessageParam[] = [
              {
                role: 'assistant',
                content: `${automation.listener?.prompt}: Keep responses under 2 sentences`
              }
            ]

            try {
              const smart_ai_message = await openai.chat.completions.create({
                model: 'gpt-4',
                messages
              })

              if (smart_ai_message.choices[0].message.content) {
                const reciever = createChatHistory(
                  automation.id,
                  entry.id,
                  entry.messaging[0].sender.id,
                  entry.messaging[0].message.text
                )

                const sender = createChatHistory(
                  automation.id,
                  entry.id,
                  entry.messaging[0].sender.id,
                  smart_ai_message.choices[0].message.content
                )

                await client.$transaction([
                  client.dms.create({ data: await reciever }),
                  client.dms.create({ data: await sender })
                ])

                const direct_message = await sendDM(
                  entry.id,
                  entry.messaging[0].sender.id,
                  smart_ai_message.choices[0].message.content,
                  automation.User?.integrations[0].token!
                )

                if (direct_message.status === 200) {
                  await trackResponses(automation.id, 'DM')
                  return NextResponse.json({ message: 'AI response sent' }, { status: 200 })
                }
              }
            } catch (error) {
              webhookLogger.logError('SMARTAI processing error', error)
              return NextResponse.json(
                { message: 'Error processing AI response' },
                { status: 500 }
              )
            }
          }
        }
      }

      // Rest of your code...
    }

    return NextResponse.json({ message: 'No automation set' }, { status: 200 })
  } catch (error) {
    webhookLogger.logError('Webhook processing error', error)
    return NextResponse.json(
      { message: 'Error processing webhook' },
      { status: 500 }
    )
  }
}