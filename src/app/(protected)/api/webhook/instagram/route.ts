// src/app/(protected)/api/webhook/instagram/route.ts
import { sendDM } from '@/lib/fetch'; // Your Instagram DM function
import { openai } from '@/lib/openai'; // Your OpenAI client
import { NextRequest, NextResponse } from 'next/server';

console.log("=== Route file loaded ===");

// Define plan type
type SubscriptionPlan = 'FREE' | 'PRO';

// Hardcoded config (replace with your actual values)
const INSTAGRAM_TOKEN: string = 'your_valid_instagram_token_here'; // From Meta Developer Portal
const USER_PLAN: SubscriptionPlan = 'PRO'; // Toggle between 'FREE' or 'PRO'
const KEYWORDS: string[] = ['heyy', 'hi', 'hello']; // Target keywords
const TEMPLATE_DM: string = 'Thanks for reaching out! How can I help?'; // FREE plan template
const TEMPLATE_COMMENT: string = 'Great comment! DM us for more!'; // FREE/PRO comment reply
const AI_PROMPT: string = 'You are a friendly assistant for WebProdigies. Reply in max 100 chars about our business.'; // PRO plan AI prompt

// Simple in-memory chat history (replace with DB if needed)
const chatHistory: { [key: string]: { role: 'user' | 'assistant'; content: string }[] } = {};

export async function GET(req: NextRequest) {
  console.log("=== GET request received ===");
  const hub = req.nextUrl.searchParams.get('hub.challenge');
  console.log("Hub challenge:", hub);
  return new NextResponse(hub);
}

export async function POST(req: NextRequest) {
  console.log("=== WEBHOOK POST START ===");
  try {
    const payload = await req.json();
    console.log("Payload:", JSON.stringify(payload, null, 2));

    const entry = payload.entry?.[0];
    if (!entry) {
      console.log("❌ No entry");
      return NextResponse.json({ message: 'No entry' }, { status: 200 });
    }

    console.log("Entry ID:", entry.id);

    const messaging = entry.messaging?.[0];
    if (!messaging?.message?.text || messaging.read || messaging.message.is_echo) {
      console.log("Skipping non-text, read, or echo:", {
        hasText: !!messaging?.message?.text,
        isRead: messaging?.read,
        isEcho: messaging?.message?.is_echo,
      });
      return NextResponse.json({ message: 'Skipped' }, { status: 200 });
    }

    const messageText = messaging.message.text;
    const userId = messaging.sender.id;
    const accountId = entry.id; // Instagram ID
    console.log("📝 Message:", messageText, "User:", userId, "Account:", accountId);

    // Check for keywords
    const hasKeyword = KEYWORDS.some(k => messageText.toLowerCase().includes(k.toLowerCase()));
    console.log("🔍 Has keyword:", hasKeyword);

    // Chat history key
    const chatKey = `${userId}-${accountId}`;
    if (!chatHistory[chatKey]) chatHistory[chatKey] = [];
    const history = chatHistory[chatKey];
    const isOngoing = history.length > 0;
    console.log("🔄 Ongoing chat:", isOngoing, "History length:", history.length);

    if (USER_PLAN === 'FREE') {
      if (hasKeyword && !isOngoing) {
        // FREE: Send template DM and end chat
        console.log("📤 FREE DM:", TEMPLATE_DM);
        const dmResponse = await sendDM(accountId, userId, TEMPLATE_DM, INSTAGRAM_TOKEN);
        console.log("✅ DM Sent:", JSON.stringify(dmResponse, null, 2));

        // Simulate comment reply (Instagram API for comments not included)
        console.log("📤 FREE Comment:", TEMPLATE_COMMENT);
        return NextResponse.json({ message: 'FREE template sent' }, { status: 200 });
      }
      console.log("ℹ️ FREE: No action (no keyword or ongoing chat)");
      return NextResponse.json({ message: 'FREE no action' }, { status: 200 });
    } else if (USER_PLAN === 'PRO') {
      if (hasKeyword && !isOngoing) {
        // PRO: Start AI chat with keyword trigger
        console.log("🤖 PRO: Starting AI chat");
        const aiResponse = await openai.chat.completions.create({
          model: 'gpt-3.5-turbo', // Use your preferred model
          messages: [
            { role: 'system', content: AI_PROMPT },
            { role: 'user', content: messageText },
          ],
          max_tokens: 40,
          temperature: 0.1,
        });
        let reply = aiResponse.choices?.[0]?.message?.content || 'WebProdigies here!';
        if (reply.length > 100) reply = reply.substring(0, 97) + "...";
        console.log("📤 PRO AI DM:", reply);

        const dmResponse = await sendDM(accountId, userId, reply, INSTAGRAM_TOKEN);
        console.log("✅ DM Sent:", JSON.stringify(dmResponse, null, 2));

        // Update chat history
        chatHistory[chatKey].push({ role: 'user', content: messageText });
        chatHistory[chatKey].push({ role: 'assistant', content: reply });

        // Simulate comment reply
        console.log("📤 PRO Comment:", TEMPLATE_COMMENT);
        return NextResponse.json({ message: 'PRO AI started' }, { status: 200 });
      } else if (isOngoing) {
        // PRO: Continue AI chat
        console.log("🤖 PRO: Continuing AI chat");
        const limitedHistory = history.slice(-5);
        limitedHistory.push({ role: 'user', content: messageText });

        const aiResponse = await openai.chat.completions.create({
          model: 'gpt-3.5-turbo',
          messages: [
            { role: 'system', content: AI_PROMPT },
            ...limitedHistory,
          ],
          max_tokens: 40,
          temperature: 0.1,
        });
        let reply = aiResponse.choices?.[0]?.message?.content || 'WebProdigies here!';
        if (reply.length > 100) reply = reply.substring(0, 97) + "...";
        console.log("📤 PRO AI DM:", reply);

        const dmResponse = await sendDM(accountId, userId, reply, INSTAGRAM_TOKEN);
        console.log("✅ DM Sent:", JSON.stringify(dmResponse, null, 2));

        // Update chat history
        chatHistory[chatKey].push({ role: 'user', content: messageText });
        chatHistory[chatKey].push({ role: 'assistant', content: reply });
        return NextResponse.json({ message: 'PRO AI continued' }, { status: 200 });
      }
      console.log("ℹ️ PRO: No action (no keyword, no chat)");
      return NextResponse.json({ message: 'PRO no action' }, { status: 200 });
    }

    console.log("❌ Unknown plan");
    return NextResponse.json({ message: 'Unknown plan' }, { status: 200 });
  } catch (error) {
    console.error("❌ Webhook error:", error);
    return NextResponse.json({ message: 'Webhook error' }, { status: 500 });
  }
}