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

// Type definitions for better type safety
interface WebhookPayload {
  entry: Array<{
    id: string
    messaging?: Array<{
      sender: { id: string }
      recipient: { id: string }
      message: { text: string }
    }>
    changes?: Array<{
      field: string
      value: {
        id: string
        text: string
        media: { id: string }
        from: { id: string }
      }
    }>
  }>
}

// Utility function to validate webhook payload structure
function isValidPayload(payload: any): payload is WebhookPayload {
  try {
    return (
      Array.isArray(payload.entry) &&
      payload.entry.length > 0 &&
      typeof payload.entry[0].id === 'string' &&
      (
        (Array.isArray(payload.entry[0].messaging) && payload.entry[0].messaging.length > 0) ||
        (Array.isArray(payload.entry[0].changes) && payload.entry[0].changes.length > 0)
      )
    )
  } catch {
    return false
  }
}

// Function to handle SmartAI responses
async function handleSmartAIResponse(
  automation: any,
  messages: any[],
  recipientId: string,
  senderId: string,
  messageText: string,
  token: string
) {
  try {
    const smart_ai_message = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'assistant',
          content: `${automation.listener?.prompt}: Keep responses under 2 sentences`,
        },
        ...messages,
      ],
    })

    if (smart_ai_message.choices[0].message.content) {
      // Create chat history records
      const receiver = createChatHistory(
        automation.id,
        recipientId,
        senderId,
        messageText
      )

      const sender = createChatHistory(
        automation.id,
        recipientId,
        senderId,
        smart_ai_message.choices[0].message.content
      )

      await client.$transaction([receiver, sender])

      // Send DM
      const direct_message = await sendDM(
        recipientId,
        senderId,
        smart_ai_message.choices[0].message.content,
        token
      )

      if (direct_message.status === 200) {
        await trackResponses(automation.id, 'DM')
        return true
      }
    }
    return false
  } catch (error) {
    console.error('SmartAI Response Error:', error)
    return false
  }
}

// Webhook verification endpoint
export async function GET(req: NextRequest) {
  const hub = req.nextUrl.searchParams.get('hub.challenge')
  return new NextResponse(hub)
}

// Main webhook handler
export async function POST(req: NextRequest) {
  try {
    const webhook_payload = await req.json()
    
    // Enhanced diagnostic logging
    console.log("=== Webhook Diagnostic Start ===")
    console.log("Webhook Payload:", JSON.stringify(webhook_payload, null, 2))

    // Validate payload structure
    if (!isValidPayload(webhook_payload)) {
      console.error("Invalid webhook payload structure")
      return NextResponse.json(
        { message: 'Invalid webhook payload' },
        { status: 400 }
      )
    }

    let matcher
    const entry = webhook_payload.entry[0]

    // Process messaging events
    if (entry.messaging) {
      const messaging = entry.messaging[0]
      const messageText = messaging?.message?.text || ''

      if (messageText) {
        matcher = await matchKeyword(messageText)
        console.log("Keyword match result (messaging):", matcher)
      }

      // Handle matched automation for messaging
      if (matcher?.automationId) {
        const automation = await getKeywordAutomation(matcher.automationId, true)

        if (automation?.trigger) {
          // Handle MESSAGE listener
          if (automation.listener?.listener === 'MESSAGE') {
            const direct_message = await sendDM(
              entry.id,
              messaging.sender.id,
              automation.listener.prompt,
              automation.User?.integrations[0].token!
            )

            if (direct_message.status === 200) {
              await trackResponses(automation.id, 'DM')
              return NextResponse.json({ message: 'Message sent' }, { status: 200 })
            }
          }

          // Handle SMARTAI listener
          if (
            automation.listener?.listener === 'SMARTAI' &&
            automation.User?.subscription?.plan === 'PRO'
          ) {
            const success = await handleSmartAIResponse(
              automation,
              [],
              entry.id,
              messaging.sender.id,
              messageText,
              automation.User?.integrations[0].token!
            )

            if (success) {
              return NextResponse.json({ message: 'Message sent' }, { status: 200 })
            }
          }
        }
      } else {
        // Handle customer history for unmatched messages
        const customer_history = await getChatHistory(
          messaging.recipient.id,
          messaging.sender.id
        )

        if (customer_history.history.length > 0) {
          const automation = await findAutomation(customer_history.automationId!)

          if (
            automation?.User?.subscription?.plan === 'PRO' &&
            automation.listener?.listener === 'SMARTAI'
          ) {
            const success = await handleSmartAIResponse(
              automation,
              customer_history.history,
              entry.id,
              messaging.sender.id,
              messageText,
              automation.User?.integrations[0].token!
            )

            if (success) {
              return NextResponse.json({ message: 'Message sent' }, { status: 200 })
            }
          }
        }
      }
    }

    // Process changes events (comments)
    if (entry.changes) {
      const changes = entry.changes[0]
      const commentText = changes?.value?.text || ''

      if (commentText && changes.field === 'comments') {
        matcher = await matchKeyword(commentText)
        console.log("Keyword match result (changes):", matcher)

        if (matcher?.automationId) {
          const automation = await getKeywordAutomation(matcher.automationId, false)
          const automations_post = await getKeywordPost(
            changes.value.media.id,
            automation?.id!
          )

          if (automation?.trigger && automations_post) {
            // Handle MESSAGE listener for comments
            if (automation.listener?.listener === 'MESSAGE') {
              const direct_message = await sendPrivateMessage(
                entry.id,
                changes.value.id,
                automation.listener.prompt,
                automation.User?.integrations[0].token!
              )

              if (direct_message.status === 200) {
                await trackResponses(automation.id, 'COMMENT')
                return NextResponse.json({ message: 'Message sent' }, { status: 200 })
              }
            }

            // Handle SMARTAI listener for comments
            if (
              automation.listener?.listener === 'SMARTAI' &&
              automation.User?.subscription?.plan === 'PRO'
            ) {
              const success = await handleSmartAIResponse(
                automation,
                [],
                entry.id,
                changes.value.from.id,
                commentText,
                automation.User?.integrations[0].token!
              )

              if (success) {
                return NextResponse.json({ message: 'Message sent' }, { status: 200 })
              }
            }
          }
        }
      }
    }

    return NextResponse.json({ message: 'No automation set' }, { status: 200 })
  } catch (error) {
    console.error("Webhook Error:", error)
    return NextResponse.json(
      { message: 'Error occurred during automation process' },
      { status: 500 }
    )
  }
}