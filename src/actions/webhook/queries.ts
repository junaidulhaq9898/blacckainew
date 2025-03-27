// src/actions/webhook/queries.ts
import { client } from '@/lib/prisma';
import axios from 'axios';

// Match keyword in the comment text
export const matchKeyword = async (keyword: string) => {
  return await client.keyword.findFirst({
    where: {
      word: {
        equals: keyword,
        mode: 'insensitive', // Case insensitive search
      },
    },
  });
};

// Send a comment reply
export const sendCommentReply = async (
  userId: string,
  commentId: string,
  reply: string,
  token: string
) => {
  console.log('Sending reply to comment:', commentId);
  const response = await axios.post(
    `${process.env.INSTAGRAM_BASE_URL}/v21.0/${userId}/comments`,
    { message: reply, comment_id: commentId },
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    }
  );
  return response.data;
};

// Fetch automation for comment or DM
export const getKeywordAutomation = async (
  automationId: string,
  dm: boolean
) => {
  return await client.automation.findUnique({
    where: {
      id: automationId,
    },
    include: {
      dms: dm,
      trigger: {
        where: {
          type: dm ? 'DM' : 'COMMENT', // Ensure we process COMMENT trigger
        },
      },
      listener: true,
      User: {
        select: {
          id: true, // Added user id for sending comment reply
          subscription: {
            select: {
              plan: true,
            },
          },
          integrations: {
            select: {
              token: true, // Make sure to select token from integrations
            },
          },
        },
      },
    },
  });
};

// Check if the comment contains a keyword and trigger reply
export const processComment = async (
  commentId: string,
  commentText: string,
  automationId: string
) => {
  // Fetch all keywords for the automation
  const keywords = await client.keyword.findMany({
    where: { automationId },
  });

  // Check each keyword to see if it exists in the comment text
  for (const keyword of keywords) {
    if (commentText.toLowerCase().includes(keyword.word.toLowerCase())) {
      console.log(`Keyword matched: ${keyword.word}`);
      // Retrieve the automation (with User and listener details)
      const automation = await getKeywordAutomation(automationId, false);
      if (automation?.User) { // Check if User is not null
        const commentReply = automation.listener?.commentReply;

        // Check if a reply exists and send it
        if (commentReply) {
          // Extract token from the first integration
          const token = automation.User.integrations?.[0]?.token;
          if (token) {
            // Send the reply to the comment using the user id from automation.User.id
            await sendCommentReply(automation.User.id, commentId, commentReply, token);
            // Optionally, track the response (increment comment count)
            await trackResponses(automationId, 'COMMENT');
          } else {
            console.error('Token not found in integrations.');
          }
        } else {
          console.log('No comment reply set for this automation.');
        }
      } else {
        console.error('User information not found in automation.');
      }
    }
  }
};

// Track responses (comments or DM)
export const trackResponses = async (
  automationId: string,
  type: 'COMMENT' | 'DM'
) => {
  if (type === 'COMMENT') {
    return await client.listener.update({
      where: { automationId },
      data: {
        commentCount: {
          increment: 1,
        },
      },
    });
  }

  if (type === 'DM') {
    return await client.listener.update({
      where: { automationId },
      data: {
        dmCount: {
          increment: 1,
        },
      },
    });
  }
};
