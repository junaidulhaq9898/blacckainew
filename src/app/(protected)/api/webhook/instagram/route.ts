import { findAutomation } from '@/actions/automations/queries';
import {
  createChatHistory,
  getChatHistory,
  getKeywordAutomation,
  matchKeyword,
  trackResponses,
} from '@/actions/webhook/queries';
import { sendDM, sendCommentReply } from '@/lib/fetch';
import { openRouter } from '@/lib/openrouter';
import { client } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

const processedComments = new Set<string>();

interface Integration {
  token: string;
  instagramId: string | null;
}

export async function GET(req: NextRequest) {
  const hub = req.nextUrl.searchParams.get('hub.challenge');
  return new NextResponse(hub);
}

async function validateToken(token: string): Promise<boolean> {
  try {
    const response = await axios.get('https://graph.instagram.com/me', {
      params: { fields: 'id,username', access_token: token },
    });
    console.log("Token validated:", response.data);
    return true;
  } catch (error: any) {
    console.error("Token validation failed:", {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data,
    });
    return false;
  }
}

export async function POST(req: NextRequest) {
  try {
    const webhook_payload = await req.json();
    console.log("=== WEBHOOK DEBUG START ===");
    console.log("Full Webhook Payload:", JSON.stringify(webhook_payload, null, 2));

    const entry = webhook_payload.entry?.[0];
    if (!entry) {
      console.log("No entry in webhook payload");
      return NextResponse.json({ message: 'No entry found' }, { status: 200 });
    }

    console.log("Entry ID:", entry.id);

    if (entry.changes && entry.changes[0].field === 'comments') {
      const commentData = entry.changes[0].value;
      const commentText = commentData.text.toLowerCase();
      const commentId = commentData.id;
      const postId = commentData.media.id;
      const commenterId = commentData.from.id;
      const parentId = commentData.parent_id;

      if (processedComments.has(commentId)) {
        console.log("Comment already processed:", commentId);
        return NextResponse.json({ message: 'Comment already processed' }, { status: 200 });
      }

      console.log("Processing comment:", commentText, "Comment ID:", commentId, "Post ID:", postId, "Commenter ID:", commenterId);

      const isReplyComment = !!parentId;
      if (isReplyComment) {
        console.log("Skipping DM for reply comment:", commentId, "Parent ID:", parentId);
      }

      // Query for automation associated with the post
      const automation = await client.automation.findFirst({
        where: {
          posts: { some: { postid: postId } },
          User: { integrations: { some: { token: { not: undefined } } } },
        },
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
        console.log("No automation or listener data found for post ID:", postId);
        return NextResponse.json({ message: 'No automation or listener data found' }, { status: 200 });
      }

      console.log("Automation found:", automation.id, "Plan:", automation.User?.subscription?.plan);

      const token = automation.User?.integrations.find((i: Integration) => i.instagramId === entry.id)?.token || automation.User?.integrations[0]?.token;
      if (!token) {
        console.log("No valid integration token found");
        return NextResponse.json({ message: 'No valid integration token' }, { status: 200 });
      }

      const isTokenValid = await validateToken(token);
      if (!isTokenValid) {
        console.log("Invalid token, skipping comment reply and DM");
        return NextResponse.json({ message: 'Invalid token' }, { status: 200 });
      }

      const plan = automation.User?.subscription?.plan || 'FREE';
      const prompt = automation.listener.prompt;
      const commentReply = automation.listener.commentReply;

      // Handle comment reply
      try {
        console.log("Sending comment reply:", commentReply);
        const replyResponse = await sendCommentReply(commentId, commentReply, token);
        console.log("Comment reply sent successfully:", replyResponse);
        await trackResponses(automation.id, 'COMMENT', commentId);
        processedComments.add(commentId);
      } catch (error: any) {
        console.error("Error sending comment reply:", {
          commentId,
          message: error.message,
          status: error.response?.status,
          data: error.response?.data,
        });
      }

      // Handle DM if not a reply comment
      if (!isReplyComment) {
        let dmMessage = prompt;
        if (plan === 'PRO') {
          console.log("PRO: Generating OpenRouter AI DM");
          try {
            // Attempt to match a keyword
            const matcher = await matchKeyword(commentText);
            console.log("Keyword match result:", matcher);

            let systemMessage = prompt;
            if (matcher?.automationId) {
              const keywordAutomation = await getKeywordAutomation(matcher.automationId, true);
              systemMessage = keywordAutomation?.listener?.prompt || prompt;
              console.log("Using keyword system message:", systemMessage);
            } else {
              console.log("No keyword match, using default prompt:", systemMessage);
            }

            // Generate AI response
            const aiResponse = await openRouter.chat.completions.create({
              model: 'nvidia/llama-3.3-nemotron-super-49b-v1:free',
              messages: [
                { role: 'system', content: systemMessage },
                { role: 'user', content: commentText },
              ],
              max_tokens: 150,  // Increased tokens for a more detailed response
              temperature: 0.1,
            });

            console.log("Raw AI response:", JSON.stringify(aiResponse, null, 2));

            // If AI responds correctly, use the content
            if (aiResponse.choices?.[0]?.message?.content) {
              dmMessage = aiResponse.choices[0].message.content;
              console.log("AI DM generated:", dmMessage);

              // Ensure the response is not too long
              if (dmMessage.length > 150) {
                console.warn(`AI response too long (${dmMessage.length} chars), truncating to 150 chars`);
                dmMessage = dmMessage.substring(0, 147) + "...";
              }
            } else {
              console.warn("No valid AI response, using fallback prompt");
              dmMessage = 'Hi! Ask away! I’m here to help!';
            }
          } catch (aiError: any) {
            console.error("AI DM generation failed:", {
              message: aiError.message,
              status: aiError.response?.status,
              data: aiError.response?.data,
            });
            dmMessage = 'Hi! Ask away! I’m here to help!';
            console.log("AI failed, using fallback prompt:", dmMessage);
          }
        }

        // Send the DM to the user
        try {
          console.log("Sending DM with message:", dmMessage);
          const dmResponse = await sendDM(entry.id, commenterId, dmMessage, token);
          console.log("DM sent successfully:", dmResponse);
          await createChatHistory(automation.id, commenterId, entry.id, commentText);
          await createChatHistory(automation.id, entry.id, commenterId, dmMessage);
          await trackResponses(automation.id, 'DM', commentId);
        } catch (error: any) {
          console.error("Error sending DM:", {
            message: error.message,
            status: error.response?.status,
            data: error.response?.data,
          });
        }
      }

      console.log("Comment processing completed");
      return NextResponse.json({ message: 'Comment processed' }, { status: 200 });
    }

    console.log("=== WEBHOOK DEBUG END ===");
    return NextResponse.json({ message: 'No automation set' }, { status: 200 });
  } catch (error: any) {
    console.error("Webhook Error:", {
      message: error.message,
      stack: error.stack,
    });
    return NextResponse.json({ message: 'Error processing webhook' }, { status: 500 });
  }
}
