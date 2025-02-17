'use server'
import { client } from '@/lib/prisma'

// Helper function to validate Instagram integration
const validateIntegrationForAutomation = async (automationId: string) => {
  const automation = await client.automation.findUnique({
    where: { id: automationId },
    include: {
      User: {
        select: {
          integrations: {
            where: {
              name: 'INSTAGRAM',
              expiresAt: { gt: new Date() }
            }
          }
        }
      }
    }
  });

  if (!automation?.User?.integrations?.[0]) {
    throw new Error('Valid Instagram integration required');
  }

  return automation;
};

export const matchKeyword = async (keyword: string) => {
  try {
    return await client.keyword.findFirst({
      where: {
        word: {
          equals: keyword,
          mode: 'insensitive',
        },
      },
      select: {
        id: true,
        automationId: true,
        Automation: {
          select: {
            User: {
              select: {
                integrations: {
                  where: {
                    name: 'INSTAGRAM',
                    expiresAt: { gt: new Date() }
                  }
                }
              }
            }
          }
        }
      }
    });
  } catch (error) {
    console.error('Match keyword error:', error);
    throw error;
  }
};

export const getKeywordAutomation = async (
  automationId: string,
  dm: boolean
) => {
  try {
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
              where: {
                name: 'INSTAGRAM',
                expiresAt: { gt: new Date() }
              },
              select: {
                token: true,
                expiresAt: true,
                instagramId: true
              }
            },
          },
        },
      },
    });
  } catch (error) {
    console.error('Get keyword automation error:', error);
    throw error;
  }
};

export const trackResponses = async (
  automationId: string,
  type: 'COMMENT' | 'DM'
) => {
  try {
    // Validate integration before tracking
    await validateIntegrationForAutomation(automationId);

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
  } catch (error) {
    console.error('Track responses error:', error);
    throw error;
  }
};

export const createChatHistory = async (
  automationId: string,
  sender: string,
  reciever: string,
  message: string
) => {
  try {
    // Validate integration before creating chat history
    await validateIntegrationForAutomation(automationId);

    return await client.automation.update({
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
  } catch (error) {
    console.error('Create chat history error:', error);
    throw error;
  }
};

export const getKeywordPost = async (postId: string, automationId: string) => {
  try {
    // Validate integration before getting post
    await validateIntegrationForAutomation(automationId);

    return await client.post.findFirst({
      where: {
        AND: [{ postid: postId }, { automationId }],
      },
      select: { 
        automationId: true,
        Automation: {
          select: {
            User: {
              select: {
                integrations: {
                  where: {
                    name: 'INSTAGRAM',
                    expiresAt: { gt: new Date() }
                  }
                }
              }
            }
          }
        }
      },
    });
  } catch (error) {
    console.error('Get keyword post error:', error);
    throw error;
  }
};

export const getChatHistory = async (sender: string, reciever: string) => {
  try {
    const history = await client.dms.findMany({
      where: {
        AND: [{ senderId: sender }, { reciever }],
      },
      orderBy: { createdAt: 'asc' },
      include: {
        Automation: {
          select: {
            User: {
              select: {
                integrations: {
                  where: {
                    name: 'INSTAGRAM',
                    expiresAt: { gt: new Date() }
                  }
                }
              }
            }
          }
        }
      }
    });

    const chatSession: {
      role: 'assistant' | 'user';
      content: string;
    }[] = history.map((chat) => ({
      role: chat.reciever ? 'assistant' : 'user',
      content: chat.message!,
    }));

    return {
      history: chatSession,
      automationId: history[history.length - 1]?.automationId,
    };
  } catch (error) {
    console.error('Get chat history error:', error);
    throw error;
  }
};

// Rate limiting helper
export const checkRateLimit = async (instagramId: string): Promise<boolean> => {
  try {
    const key = `rate_limit:${instagramId}`;
    const hourlyLimit = 100; // Instagram API limit per hour
    
    // Implement your rate limiting logic here
    // This is a placeholder - you should implement proper rate limiting
    // using Redis or a similar solution

    return true;
  } catch (error) {
    console.error('Rate limit check error:', error);
    return false;
  }
};