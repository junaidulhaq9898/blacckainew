import {
  createChatHistory,
  getChatHistory,
  trackResponses,
} from '@/actions/webhook/queries';
import { sendDM } from '@/lib/fetch';
import { client } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    // Log request headers and body to ensure webhook is hitting the server
    console.log("=== WEBHOOK DEBUG START ===");
    console.log("Request Headers:", req.headers);
    const webhook_payload = await req.json();
    console.log("Payload:", JSON.stringify(webhook_payload, null, 2));

    // Ensure that the entry is valid in the payload
    const entry = webhook_payload.entry?.[0];
    if (!entry) {
      console.log("❌ No entry found in payload");
      return NextResponse.json({ message: 'No entry' }, { status: 400 });
    }

    const messaging = entry.messaging?.[0];
    if (!messaging?.message?.text || messaging.read || messaging.message.is_echo) {
      console.log("❌ No valid message or message is echo or read. Skipping...");
      return NextResponse.json({ message: 'Skipped' }, { status: 200 });
    }

    const messageText = messaging.message.text;
    const userId = messaging.sender.id;
    const accountId = entry.id; // Instagram ID
    console.log("Message Text:", messageText, "User ID:", userId, "Account ID:", accountId);

    // Fetch integration for the user
    const integration = await client.integrations.findFirst({
      where: { instagramId: accountId },
      select: { userId: true, token: true },
    });

    if (!integration || !integration.userId) {
      console.log("❌ No integration found for this Instagram account.");
      return NextResponse.json({ message: 'No integration found' }, { status: 400 });
    }

    // Check if automation exists for this account
    let automation = await client.automation.findFirst({
      where: { userId: integration.userId, instagramId: accountId },
      include: { listener: true },
    });

    if (!automation || !automation.active) {
      console.log("⚠️ Automation not found or not active. Creating new automation...");
      automation = await client.automation.create({
        data: {
          userId: integration.userId,
          instagramId: accountId,
          listener: {
            create: {
              prompt: `Assistant for WebProdigies_${accountId}`,
              commentReply: "ok",
              listener: "SMARTAI",
            },
          },
          active: true,
        },
        include: { listener: true },
      });
      console.log("✅ New automation created:", automation.id);
    }

    // Fetch the correct token for the automation
    let token = integration.token;  // Use token from integration
    if (!token) {
      console.log("❌ No valid token found.");
      return NextResponse.json({ message: 'No valid token' }, { status: 400 });
    }

    // Prepare and send the DM (Test step)
    try {
      const messageResponse = `Hello from ${accountId}! How can I assist?`;
      console.log("Sending DM:", messageResponse);
      const dmResponse = await sendDM(accountId, userId, messageResponse, token);
      console.log("✅ DM sent successfully:", JSON.stringify(dmResponse, null, 2));
      await createChatHistory(automation.id, userId, accountId, messageText);
      await createChatHistory(automation.id, accountId, userId, messageResponse);
      await trackResponses(automation.id, 'DM');
      return NextResponse.json({ message: 'Message sent' }, { status: 200 });
    } catch (error) {
      console.error("❌ Error sending DM:", error);
      return NextResponse.json({ message: 'Error sending message' }, { status: 500 });
    }
  } catch (error) {
    console.error("❌ Webhook error:", error);
    return NextResponse.json({ message: 'Webhook error' }, { status: 500 });
  }
}
