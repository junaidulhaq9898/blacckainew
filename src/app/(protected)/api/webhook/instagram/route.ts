// src/app/(protected)/api/webhook/instagram/route.ts
import { findAutomation } from '@/actions/automations/queries'
import {
  createChatHistory,
  getChatHistory,
  getKeywordAutomation,
  getKeywordPost,
  matchKeyword,
  trackResponses,
} from '@/actions/webhook/queries'
import { sendDM, DmResponse } from '@/lib/fetch' // Updated import
import { openai } from '@/lib/openai'
import { client } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

// Webhook verification endpoint
export async function GET(req: NextRequest) {
  const hub = req.nextUrl.searchParams.get('hub.challenge')
  return new NextResponse(hub)
}

// Main webhook handler
export async function POST(req: NextRequest) {
  try {
    const webhook_payload = await req.json()
    console.log("=== WEBHOOK DEBUG START ===")
    console.log("Full Webhook Payload:", JSON.stringify(webhook_payload, null, 2))

    const entry = webhook_payload.entry?.[0]
    if (!entry) {
      console.log("❌ No entry in webhook payload")
      return NextResponse.json({ message: 'No entry found' }, { status: 200 })
    }

    console.log("Entry ID:", entry.id)
    const messaging = entry.messaging?.[0]
    console.log("Messaging Object:", JSON.stringify(messaging, null, 2))

    if (messaging?.read || messaging?.message?.is_echo) {
      console.log("Skipping read receipt or echo message")
      return NextResponse.json({ message: 'Receipt processed' }, { status: 200 })
    }

    if (messaging?.message?.text) {
      const messageText = messaging.message.text
      console.log("📝 Processing message:", messageText)

      const matcher = await matchKeyword(messageText)
      console.log("🔍 Keyword match result:", matcher)

      if (matcher?.automationId) {
        console.log("✅ Found matching automation ID:", matcher.automationId)
        
        const automation = await getKeywordAutomation(matcher.automationId, true)
        console.log("🤖 Automation details:", automation?.id)

        const token = automation?.User?.integrations?.[0]?.token
        if (!token) {
          console.log("❌ No valid integration token found")
          return NextResponse.json(
            { message: 'No valid integration token' },
            { status: 200 }
          )
        }

        if (automation.listener?.listener === 'MESSAGE') {
          try {
            console.log("📤 Attempting to send DM")
            const direct_message: DmResponse = await sendDM(
              entry.id,
              messaging.sender.id,
              automation.listener.prompt,
              token
            )

            console.log("📬 DM Response:", direct_message)
            if (direct_message.status === 200) {
              await trackResponses(automation.id, 'DM')
              console.log("✅ Message sent successfully")
              return NextResponse.json({ message: 'Message sent' }, { status: 200 })
            }
          } catch (error) {
            console.error("❌ Error sending DM:", error)
            return NextResponse.json(
              { message: 'Error sending message' },
              { status: 500 }
            )
          }
        }

        if (
          automation.listener?.listener === 'SMARTAI' &&
          automation.User?.subscription?.plan === 'PRO'
        ) {
          try {
            console.log("🤖 Processing SMARTAI response")
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
            })

            const aiContent = smart_ai_message.choices[0].message.content
            if (aiContent) {
              console.log("💾 Creating chat history")
              const [receiver, sender] = await Promise.all([
                createChatHistory(
                  automation.id,
                  entry.id,
                  messaging.sender.id,
                  messageText
                ),
                createChatHistory(
                  automation.id,
                  entry.id,
                  messaging.sender.id,
                  aiContent
                )
              ])

              await client.$transaction([
                client.dms.create({ data: receiver }),
                client.dms.create({ data: sender })
              ])

              console.log("📤 Sending AI response as DM")
              const direct_message: DmResponse = await sendDM(
                entry.id,
                messaging.sender.id,
                aiContent,
                token
              )

              if (direct_message.status === 200) {
                await trackResponses(automation.id, 'DM')
                console.log("✅ AI response sent successfully")
                return NextResponse.json(
                  { message: 'AI response sent' },
                  { status: 200 }
                )
              }
            }
          } catch (error) {
            console.error("❌ Error processing AI response:", error)
            return NextResponse.json(
              { message: 'Error processing AI response' },
              { status: 500 }
            )
          }
        }
      }
    }

    console.log("=== WEBHOOK DEBUG END ===")
    return NextResponse.json({ message: 'No automation set' }, { status: 200 })
  } catch (error) {
    console.error("❌ Webhook Error:", error)
    return NextResponse.json(
      { message: 'Error processing webhook' },
      { status: 500 }
    )
  }
}