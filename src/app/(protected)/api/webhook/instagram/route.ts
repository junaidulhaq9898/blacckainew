// src/app/(protected)/api/webhook/instagram/route.ts
import { findAutomation } from '@/actions/automations/queries'
import {
  createChatHistory,
  getChatHistory,
  getKeywordAutomation,
  matchKeyword,
  trackResponses,
} from '@/actions/webhook/queries'
import { sendDM } from '@/lib/fetch'
import { openai } from '@/lib/openai'
import { client } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

// Constants and Types
const INSTAGRAM_ERROR_CODES = {
  INVALID_TOKEN: 190,
  PERMISSION_ERROR: 200,
  RATE_LIMIT: 4,
  INVALID_OAUTH: 463
} as const;

type InstagramWebhookPayload = {
  entry?: Array<{
    messaging?: Array<{
      message?: {
        text?: string;
      };
      sender?: {
        id?: string;
      };
      read?: boolean;
    }>;
    changes?: any[];
    id?: string;
  }>;
};

// Rate limiting cache
const rateLimitCache = new Map<string, number>();

// Webhook validation
const validateInstagramWebhook = async (payload: InstagramWebhookPayload, token: string): Promise<boolean> => {
  try {
    // Verify token validity
    const response = await fetch(
      `${process.env.INSTAGRAM_BASE_URL}/me?access_token=${token}`
    );
    
    if (!response.ok) {
      throw new Error('Invalid Instagram token');
    }

    // Validate payload structure
    if (!payload.entry?.[0]) {
      throw new Error('Invalid webhook structure');
    }

    const entry = payload.entry[0];
    if (!entry.messaging?.[0]?.message?.text && !entry.changes) {
      throw new Error('Invalid webhook content');
    }

    return true;
  } catch (error) {
    console.error('Webhook validation error:', error);
    return false;
  }
};

// Rate limiting implementation
const checkRateLimit = (instagramId: string): boolean => {
  const NOW = Date.now();
  const WINDOW_SIZE = 60000; // 1 minute
  const MAX_REQUESTS = 5;

  const requests = rateLimitCache.get(instagramId) || 0;
  
  if (requests >= MAX_REQUESTS) {
    return false;
  }

  rateLimitCache.set(instagramId, requests + 1);
  setTimeout(() => {
    const current = rateLimitCache.get(instagramId) || 0;
    rateLimitCache.set(instagramId, Math.max(0, current - 1));
  }, WINDOW_SIZE);

  return true;
};

export async function POST(req: NextRequest) {
  try {
    const webhookPayload: InstagramWebhookPayload = await req.json();
    console.log("Webhook Payload:", JSON.stringify(webhookPayload, null, 2));

    const entry = webhookPayload.entry?.[0];
    if (!entry?.id) {
      console.log("Invalid entry in webhook payload");
      return NextResponse.json({ message: 'No entry found' }, { status: 200 });
    }

    const messaging = entry.messaging?.[0];
    if (messaging?.read && !messaging?.message) {
      console.log("Skipping read receipt");
      return NextResponse.json({ message: 'Read receipt processed' }, { status: 200 });
    }

    const messageText = messaging?.message?.text;
    const senderId = messaging?.sender?.id;

    if (messageText && senderId) {
      console.log("Processing message:", messageText);

      const matcher = await matchKeyword(messageText);
      console.log("Keyword match result:", matcher);

      if (matcher?.automationId) {
        const automation = await getKeywordAutomation(matcher.automationId, true);
        
        // Validate automation and user
        const token = automation?.User?.integrations?.[0]?.token;
        if (!token || !automation?.User) {
          console.log("No valid integration token found");
          return NextResponse.json(
            { message: 'No valid integration token' },
            { status: 200 }
          );
        }

        // Rate limiting check
        if (!checkRateLimit(entry.id)) {
          console.log("Rate limit exceeded for Instagram ID:", entry.id);
          return NextResponse.json(
            { message: 'Rate limit exceeded' },
            { status: 429 }
          );
        }

        // Validate webhook payload
        if (!(await validateInstagramWebhook(webhookPayload, token))) {
          console.error("Invalid webhook or expired token");
          return NextResponse.json(
            { message: 'Invalid webhook or token' },
            { status: 400 }
          );
        }

        // Handle MESSAGE listener
        if (automation.listener?.listener === 'MESSAGE') {
          try {
            const directMessage = await sendDM(
              entry.id,
              senderId,
              automation.listener.prompt || '',
              token
            );

            if (directMessage.status === 200) {
              await trackResponses(automation.id, 'DM');
              return NextResponse.json({ message: 'Message sent' }, { status: 200 });
            }
          } catch (error: any) {
            console.error("Error sending DM:", error);
            const errorCode = error.response?.data?.error?.code;
            
            switch (errorCode) {
              case INSTAGRAM_ERROR_CODES.INVALID_TOKEN:
                return NextResponse.json(
                  { message: 'Token expired' },
                  { status: 401 }
                );
              case INSTAGRAM_ERROR_CODES.PERMISSION_ERROR:
                return NextResponse.json(
                  { message: 'Permission denied' },
                  { status: 403 }
                );
              case INSTAGRAM_ERROR_CODES.RATE_LIMIT:
                return NextResponse.json(
                  { message: 'Rate limit exceeded' },
                  { status: 429 }
                );
              default:
                return NextResponse.json(
                  { message: 'Error sending message' },
                  { status: 500 }
                );
            }
          }
        }

        // Handle SMARTAI listener
        if (
          automation.listener?.listener === 'SMARTAI' &&
          automation.User.subscription?.plan === 'PRO'
        ) {
          try {
            const aiResponse = await openai.chat.completions.create({
              model: 'gpt-4',
              messages: [
                {
                  role: 'system',
                  content: `${automation.listener.prompt || ''}: Keep responses under 2 sentences`
                },
                {
                  role: 'user',
                  content: messageText
                }
              ]
            });

            const aiContent = aiResponse.choices[0]?.message?.content;
            if (aiContent) {
              await client.$transaction(async (tx) => {
                const receiverData = await createChatHistory(
                  automation.id,
                  entry.id!,
                  senderId,
                  messageText
                );

                const senderData = await createChatHistory(
                  automation.id,
                  entry.id!,
                  senderId,
                  aiContent
                );

                await tx.dms.create({ data: receiverData });
                await tx.dms.create({ data: senderData });

                const directMessage = await sendDM(
                  entry.id!,
                  senderId,
                  aiContent,
                  token
                );

                if (directMessage.status === 200) {
                  await trackResponses(automation.id, 'DM');
                }
              });

              return NextResponse.json(
                { message: 'AI response sent' },
                { status: 200 }
              );
            }
          } catch (error: any) {
            console.error("Error processing AI response:", error);
            
            if (error.response?.data?.error?.code === INSTAGRAM_ERROR_CODES.INVALID_TOKEN) {
              return NextResponse.json(
                { message: 'Token expired' },
                { status: 401 }
              );
            }

            return NextResponse.json(
              { message: 'Error processing AI response' },
              { status: 500 }
            );
          }
        }
      }
    }

    return NextResponse.json({ message: 'No automation set' }, { status: 200 });
  } catch (error) {
    console.error("Webhook Error:", error);
    return NextResponse.json(
      { message: 'Error processing webhook' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  const hubChallenge = req.nextUrl.searchParams.get('hub.challenge');
  return new NextResponse(hubChallenge || undefined, {
    status: hubChallenge ? 200 : 400
  });
}