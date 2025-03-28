// src/actions/webhook/queries.ts
import { client } from '@/lib/prisma';
import { sendCommentReply } from '@/lib/fetch';

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

// NEW: Function to handle comment reply
export const handleCommentReply = async (
  commentId: string,      // Instagram comment ID to reply to
  automationId: string,   // Automation ID associated with this comment
  token: string           // Access token for Instagram API
) => {
  try {
    // Fetch the automation including its listener data
    const automation = await client.automation.findUnique({
      where: { id: automationId },
      include: { listener: true },
    });
    if (automation && automation.listener && automation.listener.commentReply) {
      const replyText = automation.listener.commentReply;
      // Send reply via Instagram API using the helper function
      const result = await sendCommentReply(commentId, replyText, token);
      console.log('Comment reply sent:', result);
      return result;
    } else {
      console.log('No comment reply configured for automation:', automationId);
      return null;
    }
  } catch (error) {
    console.error('Error handling comment reply:', error);
    throw error;
  }
};
