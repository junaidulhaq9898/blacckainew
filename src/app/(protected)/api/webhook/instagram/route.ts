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
import { AxiosError } from 'axios'

// Debug logging function
function debugLog(context: string, data: any) {
  console.log(`[DEBUG ${new Date().toISOString()}] ${context}:`, JSON.stringify(data, null, 2))
}

export async function POST(req: NextRequest) {
  try {
    // Log raw request details
    debugLog('Instagram Webhook - Headers', Object.fromEntries(req.headers))

    const webhook_payload = await req.json()
    debugLog('Instagram Webhook - Raw Payload', webhook_payload)

    let matcher
    const entry = webhook_payload.entry?.[0]

    if (!entry) {
      debugLog('No Entry Found', webhook_payload)
      return NextResponse.json({ message: 'No entry found' }, { status: 200 })
    }

    // Log entry details
    debugLog('Processing Entry', entry)

    // Handle messaging events
    if (entry.messaging && Array.isArray(entry.messaging)) {
      const messaging = entry.messaging[0]
      debugLog('Processing Messaging', messaging)
      
      // Check for message type
      if (messaging.message?.is_echo) {
        debugLog('Echo Message Detected', messaging.message)
        return NextResponse.json({ message: 'Echo message skipped' }, { status: 200 })
      }

      if (messaging.read) {
        debugLog('Read Receipt Detected', messaging.read)
        return NextResponse.json({ message: 'Read receipt skipped' }, { status: 200 })
      }

      // Process actual message
      if (messaging.message?.text) {
        const messageText = messaging.message.text
        debugLog('Processing Message Text', { messageText })

        const senderId = messaging.sender.id
        const recipientId = messaging.recipient.id
        debugLog('Message IDs', { senderId, recipientId })

        // Try to match keyword
        matcher = await matchKeyword(messageText)
        debugLog('Keyword Match Result', matcher)

        if (matcher?.automationId) {
          const automation = await getKeywordAutomation(matcher.automationId, true)
          debugLog('Found Automation', automation)

          if (!automation?.User?.integrations?.[0]?.token) {
            debugLog('No Valid Token', { automationId: automation?.id })
            return NextResponse.json(
              { message: 'No valid integration token' },
              { status: 200 }
            )
          }

          // Log integration details
          debugLog('Integration Details', {
            token: automation.User.integrations[0].token.substring(0, 20) + '...',
            expiresAt: automation.User.integrations[0].expiresAt
          })

          // Handle MESSAGE listener
          if (automation.listener?.listener === 'MESSAGE') {
            try {
              debugLog('Sending DM', {
                recipientId,
                senderId,
                prompt: automation.listener.prompt
              })

              const direct_message = await sendDM(
                recipientId,
                senderId,
                automation.listener.prompt,
                automation.User.integrations[0].token
              )

              debugLog('DM Response', direct_message)

              if (direct_message.status === 200) {
                await trackResponses(automation.id, 'DM')
                return NextResponse.json({ message: 'Message sent' }, { status: 200 })
              }
            } catch (err) {
              const error = err as AxiosError
              debugLog('DM Error', {
                message: error.message,
                response: error.response?.data,
                config: {
                  url: error.config?.url,
                  method: error.config?.method,
                  data: error.config?.data
                }
              })

              return NextResponse.json(
                { message: 'Error sending message', error: error?.message || 'Unknown error' },
                { status: 500 }
              )
            }
          }

          // Handle SMARTAI listener
          if (
            automation.listener?.listener === 'SMARTAI' &&
            automation.User?.subscription?.plan === 'PRO'
          ) {
            try {
              debugLog('Processing SMARTAI', { prompt: automation.listener.prompt })
              // ... rest of your SMARTAI logic ...
            } catch (err) {
              const error = err as Error
              debugLog('SMARTAI Error', error)
              return NextResponse.json(
                { message: 'Error processing AI response', error: error?.message || 'Unknown error' },
                { status: 500 }
              )
            }
          }
        } else {
          debugLog('No Automation Match', { messageText })
        }
      } else {
        debugLog('No Message Text', messaging)
      }
    } else {
      debugLog('No Messaging Array', entry)
    }

    return NextResponse.json({ message: 'No automation set' }, { status: 200 })
  } catch (err) {
    const error = err as Error
    debugLog('Webhook Error', error)
    return NextResponse.json(
      { message: 'Error processing webhook', error: error?.message || 'Unknown error' },
      { status: 500 }
    )
  }
}