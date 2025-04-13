import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { openRouter } from '@/lib/openrouter';
import { client } from '@/lib/prisma';
import { sendDM, sendCommentReply } from '@/lib/fetch';
import {
  createChatHistory,
  getChatHistory,
  getKeywordAutomation,
  matchKeyword,
  trackResponses,
} from '@/actions/webhook/queries';

const processedComments = new Set<string>();

interface Integration {
  token: string;
  instagramId: string | null;
}

/** Validates Instagram API token */
async function validateToken(token: string): Promise<boolean> {
  try {
    const response = await axios.get('https://graph.instagram.com/me', {
      params: { fields: 'id,username', access_token: token },
    });
    console.log('Token validated:', response.data);
    return true;
  } catch (error: any) {
    console.error('Token validation failed:', error.message);
    return false;
  }
}

/** Creates a tailored system message for AI responses */
function createSystemMessage(prompt: string, userMessage: string): string {
  const businessNameMatch = prompt.match(/Business Name:\s*(.+)/i);
  const locationMatch = prompt.match(/Location:\s*(.+)/i);
  const businessName = businessNameMatch ? businessNameMatch[1] : 'the business';
  const location = locationMatch ? locationMatch[1] : 'our location';

  if (userMessage.toLowerCase().includes('address') || userMessage.toLowerCase().includes('location')) {
    return `You are an assistant for ${businessName}. The office is in ${location}. Respond directly with the address concisely.`;
  }
  return `You are an assistant for ${businessName}. Respond with a friendly greeting or answer the user's question concisely, using prompt details if relevant.`;
}

/** Handles Instagram webhook GET requests (verification) */
export async function GET(req: NextRequest) {
  const hub = req.nextUrl.searchParams.get('hub.challenge');
  return new NextResponse(hub);
}

/** Handles Instagram webhook POST requests */
export async function POST(req: NextRequest) {
  try {
    const payload = await req.json();
    console.log('=== WEBHOOK DEBUG START ===');
    console.log('Webhook Payload:', JSON.stringify(payload, null, 2));

    const entry = payload.entry?.[0];
    if (!entry) {
      console.log('No entry found');
      return NextResponse.json({ message: 'No entry found' }, { status: 200 });
    }

    // Handle comments
    if (entry.changes?.[0]?.field === 'comments') {
      const commentData = entry.changes[0].value;
      const { text: commentText, id: commentId, media, from, parent_id: parentId } = commentData;
      const postId = media.id;
      const commenterId = from.id;

      if (processedComments.has(commentId)) {
        console.log('Comment already processed:', commentId);
        return NextResponse.json({ message: 'Comment already processed' }, { status: 200 });
      }

      console.log('Processing comment:', { commentText, commentId, postId, commenterId });

      const automation = await client.automation.findFirst({
        where: { posts: { some: { postid: postId } } },
        include: {
          listener: true,
          User: {
            select: {
              subscription: { select: { plan: true } },
              integrations: { select: { token: true, instagramId: true } },
            },
          },
        },
      });

      if (!automation || !automation.listener?.prompt || !automation.listener?.commentReply) {
        console.log('No automation or listener data for post:', postId);
        return NextResponse.json({ message: 'No automation found' }, { status: 200 });
      }

      // Safely get token
      const integrations = automation.User?.integrations || [];
      const token = integrations.find((i: Integration) => i.instagramId === entry.id)?.token ||
        integrations[0]?.token;

      if (!token) {
        console.log('No valid integration token found');
        return NextResponse.json({ message: 'No valid integration token' }, { status: 200 });
      }

      if (!(await validateToken(token))) {
        console.log('Invalid token');
        return NextResponse.json({ message: 'Invalid token' }, { status: 200 });
      }

      const plan = automation.User?.subscription?.plan || 'FREE';
      const prompt = automation.listener.prompt;
      const commentReply = automation.listener.commentReply;

      // Send comment reply
      try {
        await sendCommentReply(commentId, commentReply, token);
        console.log('Comment reply sent:', commentReply);
        await trackResponses(automation.id, 'COMMENT', commentId);
        processedComments.add(commentId);
      } catch (error: any) {
        console.error('Error sending comment reply:', error.message);
      }

      // Send DM if not a reply comment
      if (!parentId) {
        let dmMessage = null;
        if (plan === 'PRO') {
          console.log('PRO: Generating AI DM');
          const matcher = await matchKeyword(commentText.toLowerCase());
          const basePrompt = matcher?.automationId
            ? (await getKeywordAutomation(matcher.automationId, true))?.listener?.prompt || prompt
            : prompt;

          const systemMessage = createSystemMessage(basePrompt, commentText);
          console.log('System message:', systemMessage);

          try {
            const aiResponse = await openRouter.chat.completions.create({
              model: 'google/gemma-3-27b-it:free',
              messages: [
                { role: 'system', content: systemMessage },
                { role: 'user', content: commentText },
              ],
              max_tokens: 500,
              temperature: 0.7,
            });
            dmMessage = aiResponse.choices?.[0]?.message?.content?.trim() || 'Hi! How can I help you today?';
            console.log('AI DM:', dmMessage);
          } catch (error: any) {
            console.error('AI DM failed:', error.message);
            dmMessage = 'Hi! How can I help you today?';
          }
        } else if (plan === 'FREE') {
          const matcher = await matchKeyword(commentText.toLowerCase());
          if (matcher?.automationId) {
            dmMessage = (await getKeywordAutomation(matcher.automationId, true))?.listener?.prompt;
            console.log('FREE: Keyword DM:', dmMessage);
          } else {
            console.log('FREE: No keyword match, no DM sent');
          }
        }

        if (dmMessage) {
          try {
            await sendDM(entry.id, commenterId, dmMessage, token);
            console.log('DM sent:', dmMessage);
            await createChatHistory(automation.id, commenterId, entry.id, commentText);
            await createChatHistory(automation.id, entry.id, commenterId, dmMessage);
            await trackResponses(automation.id, 'DM', commentId);
          } catch (error: any) {
            console.error('Error sending DM:', error.message);
          }
        }
      }

      console.log('Comment processing completed');
      return NextResponse.json({ message: 'Comment processed' }, { status: 200 });
    }

    // Handle direct messages
    const messaging = entry.messaging?.[0];
    console.log('Messaging:', JSON.stringify(messaging, null, 2));

    if (messaging?.read || messaging?.message?.is_echo) {
      console.log('Skipping read receipt or echo message');
      return NextResponse.json({ message: 'Receipt processed' }, { status: 200 });
    }

    if (messaging?.message?.text) {
      const messageText = messaging.message.text;
      const userId = messaging.sender.id;
      const accountId = messaging.recipient.id;

      console.log('Processing message:', messageText, 'User:', userId, 'Account:', accountId);

      const { history, automationId } = await getChatHistory(userId, accountId);
      console.log('Chat history:', { isOngoing: history.length > 0, historyLength: history.length, automationId });

      let automation;
      if (history.length > 0 && automationId) {
        automation = await getKeywordAutomation(automationId, true);
        console.log('Continuing automation:', automation?.id);
      } else {
        const matcher = await matchKeyword(messageText.toLowerCase());
        automation = matcher?.automationId
          ? await getKeywordAutomation(matcher.automationId, true)
          : await client.automation.findFirst({
              where: { User: { integrations: { some: { instagramId: accountId } } } },
              include: {
                listener: true,
                User: {
                  select: {
                    subscription: { select: { plan: true } },
                    integrations: { select: { token: true, instagramId: true } },
                  },
                },
              },
              orderBy: { createdAt: 'desc' },
            });
        console.log('New automation:', automation?.id);
      }

      if (!automation || !automation.listener?.prompt) {
        console.log('No automation for account:', accountId);
        return NextResponse.json({ message: 'No automation found' }, { status: 200 });
      }

      // Safely get token
      const integrations = automation.User?.integrations || [];
      const token = integrations.find((i: Integration) => i.instagramId === accountId)?.token ||
        integrations[0]?.token;

      if (!token) {
        console.log('No valid integration token found');
        return NextResponse.json({ message: 'No valid integration token' }, { status: 200 });
      }

      if (!(await validateToken(token))) {
        console.log('Invalid token');
        return NextResponse.json({ message: 'Invalid token' }, { status: 200 });
      }

      const plan = automation.User?.subscription?.plan || 'FREE';
      const prompt = automation.listener.prompt;

      let reply = null;
      if (plan === 'PRO') {
        console.log('PRO: Generating AI response');
        const matcher = await matchKeyword(messageText.toLowerCase());
        console.log('Keyword match:', matcher);
        const basePrompt = matcher?.automationId
          ? (await getKeywordAutomation(matcher.automationId, true))?.listener?.prompt || prompt
          : prompt;

        const systemMessage = createSystemMessage(basePrompt, messageText);
        console.log('System message:', systemMessage);

        try {
          const aiResponse = await openRouter.chat.completions.create({
            model: 'google/gemma-3-27b-it:free',
            messages: [
              { role: 'system', content: systemMessage },
              { role: 'user', content: messageText },
            ],
            max_tokens: 500,
            temperature: 0.7,
          });
          reply = aiResponse.choices?.[0]?.message?.content?.trim() || 'Hi! How can I help you today?';
          console.log('AI reply:', reply);
        } catch (error: any) {
          console.error('AI reply failed:', error.message);
          reply = 'Hi! How can I help you today?';
        }
      } else if (plan === 'FREE') {
        const matcher = await matchKeyword(messageText.toLowerCase());
        if (matcher?.automationId) {
          reply = (await getKeywordAutomation(matcher.automationId, true))?.listener?.prompt;
          console.log('FREE: Keyword reply:', reply);
        } else {
          console.log('FREE: No keyword match, no reply sent');
        }
      }

      if (reply) {
        try {
          console.log('Sending DM:', reply);
          await sendDM(accountId, userId, reply, token);
          console.log('DM sent successfully');
          await createChatHistory(automation.id, userId, accountId, messageText);
          await createChatHistory(automation.id, accountId, userId, reply);
          await trackResponses(automation.id, 'DM');
        } catch (error: any) {
          console.error('Error sending DM:', error.message);
        }
      }

      console.log('Message processing completed');
      return NextResponse.json({ message: `${plan} message sent` }, { status: 200 });
    }

    console.log('=== WEBHOOK DEBUG END ===');
    return NextResponse.json({ message: 'No action taken' }, { status: 200 });
  } catch (error: any) {
    console.error('Webhook Error:', error.message);
    return NextResponse.json({ message: 'Error processing webhook' }, { status: 500 });
  }
}