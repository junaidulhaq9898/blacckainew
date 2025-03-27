// src/actions/webhook/queries.ts
import { client } from '@/lib/prisma';
import axios from 'axios';

// Match keyword in the comment text
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

// Existing functions
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
          type: dm ? 'DM' : 'COMMENT', // Ensure COMMENT trigger is processed
        },
      },
      listener: true,
      User: {
        select: {
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

// Other existing functions remain untouched
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

export const hasRecentMessages = async (userId: string, accountId: string, minutes: number = 5) => {
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
