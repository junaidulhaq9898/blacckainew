// src/actions/webhook/queries.ts
import { client } from '@/lib/prisma';
import axios from 'axios';

export const matchKeyword = async (keyword: string) => {
  return await client.keyword.findFirst({
    where: {
      word: {
        equals: keyword,
        mode: 'insensitive',
      },
    },
  });
};

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
          type: dm ? 'DM' : 'COMMENT',
        },
      },
      listener: true,
      User: {
        select: {
          id: true, // Added: ensure User id is selected for comment reply
          subscription: {
            select: {
              plan: true,
            },
          },
          integrations: {
            select: {
              token: true,
            },
          },
        },
      },
    },
  });
};

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

export const createChatHistory = (
  automationId: string,
  sender: string,
  reciever: string,
  message: string
) => {
  return client.automation.update({
    where: {
      id: automationId,
    },
    data: {
      dms: {
        create: {
          reciever,
          senderId: sender,
          message,
        },
      },
    },
  });
};

export const getKeywordPost = async (postId: string, automationId: string) => {
  return await client.post.findFirst({
    where: {
      AND: [{ postid: postId }, { automationId }],
    },
    select: { automationId: true },
  });
};

export const getChatHistory = async (userId: string, accountId: string) => {
  const history = await client.dms.findMany({
    where: {
      OR: [
        { senderId: userId, reciever: accountId },
        { senderId: accountId, reciever: userId },
      ],
    },
    orderBy: { createdAt: 'asc' },
  });
  const chatSession: {
    role: 'assistant' | 'user';
    content: string;
  }[] = history.map((chat) => {
    return {
      role: chat.senderId === userId ? 'user' : 'assistant',
      content: chat.message!,
    };
  });

  return {
    history: chatSession,
    automationId: history[0]?.automationId,
  };
};

export const hasRecentMessages = async (
  userId: string,
  accountId: string,
  minutes: number = 5
) => {
  const recentTime = new Date(Date.now() - minutes * 60 * 1000);
  const recentMessages = await client.dms.findMany({
    where: {
      OR: [
        { senderId: userId, reciever: accountId, createdAt: { gt: recentTime } },
        { senderId: accountId, reciever: userId, createdAt: { gt: recentTime } },
      ],
    },
  });
  return recentMessages.length > 0;
};

// ----------------------------------------------------------------
// COMMENT AUTOMATION ADDITIONS (do not alter any existing functions above)
// ----------------------------------------------------------------

// Function to send a comment reply using Instagram API
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

// Process a comment: check if commentText contains any keyword and send reply if matched
export const processComment = async (
  commentId: string,
  commentText: string,
  automationId: string
) => {
  // Fetch all keywords for this automation
  const keywords = await client.keyword.findMany({
    where: { automationId },
  });

  // Check if any keyword is in the comment text
  for (const keyword of keywords) {
    if (commentText.toLowerCase().includes(keyword.word.toLowerCase())) {
      console.log(`Keyword matched: ${keyword.word}`);
      // Retrieve the automation (with User and listener details)
      const automation = await getKeywordAutomation(automationId, false);
      if (automation?.User) {
        const commentReply = automation.listener?.commentReply;
        if (commentReply) {
          // Extract token from the first integration (if available)
          const token = automation.User.integrations?.[0]?.token;
          if (token) {
            // Send the reply to the comment using automation.User.id as userId
            await sendCommentReply(automation.User.id, commentId, commentReply, token);
            // Track the response (increment comment count)
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
