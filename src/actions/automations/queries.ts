'use server'
import { client } from '@/lib/prisma'

// Helper function to validate Instagram integration
const validateIntegration = async (userId: string) => {
  const user = await client.user.findUnique({
    where: { id: userId },
    select: {
      integrations: {
        where: {
          name: 'INSTAGRAM',
          expiresAt: { gt: new Date() }
        }
      }
    }
  });
  return user?.integrations?.[0];
};

export const createAutomation = async (clerkId: string, id?: string) => {
  try {
    const user = await client.user.findUnique({
      where: { clerkId },
      select: { id: true }
    });

    if (!user) throw new Error('User not found');

    const integration = await validateIntegration(user.id);
    if (!integration) {
      throw new Error('Valid Instagram integration required');
    }

    return await client.user.update({
      where: { clerkId },
      data: {
        automations: {
          create: { ...(id && { id }) }
        }
      }
    });
  } catch (error) {
    console.error('Create automation error:', error);
    throw error;
  }
};

export const getAutomations = async (clerkId: string) => {
  try {
    return await client.user.findUnique({
      where: { clerkId },
      select: {
        automations: {
          orderBy: { createdAt: 'asc' },
          include: {
            keywords: true,
            listener: true,
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
    console.error('Get automations error:', error);
    throw error;
  }
};

export const findAutomation = async (id: string) => {
  try {
    const automation = await client.automation.findUnique({
      where: { id },
      include: {
        keywords: true,
        trigger: true,
        posts: true,
        listener: true,
        User: {
          select: {
            subscription: true,
            integrations: true
          }
        }
      }
    });

    if (!automation?.User?.integrations?.[0]) {
      throw new Error('Valid Instagram integration required');
    }

    return automation;
  } catch (error) {
    console.error('Find automation error:', error);
    throw error;
  }
};

export const updateAutomation = async (
  id: string,
  update: {
    name?: string
    active?: boolean
  }
) => {
  try {
    const automation = await client.automation.findUnique({
      where: { id },
      select: { User: { select: { id: true } } }
    });

    const integration = await validateIntegration(automation?.User?.id || '');
    if (!integration) {
      throw new Error('Valid Instagram integration required');
    }

    return await client.automation.update({
      where: { id },
      data: {
        name: update.name,
        active: update.active,
      }
    });
  } catch (error) {
    console.error('Update automation error:', error);
    throw error;
  }
};

export const addListener = async (
  automationId: string,
  listener: 'SMARTAI' | 'MESSAGE',
  prompt: string,
  reply?: string
) => {
  try {
    const automation = await client.automation.findUnique({
      where: { id: automationId },
      select: { User: { select: { id: true } } }
    });

    const integration = await validateIntegration(automation?.User?.id || '');
    if (!integration) {
      throw new Error('Valid Instagram integration required');
    }

    return await client.automation.update({
      where: { id: automationId },
      data: {
        listener: {
          create: {
            listener,
            prompt,
            commentReply: reply
          }
        }
      }
    });
  } catch (error) {
    console.error('Add listener error:', error);
    throw error;
  }
};

export const addTrigger = async (automationId: string, trigger: string[]) => {
  try {
    const automation = await client.automation.findUnique({
      where: { id: automationId },
      select: { User: { select: { id: true } } }
    });

    const integration = await validateIntegration(automation?.User?.id || '');
    if (!integration) {
      throw new Error('Valid Instagram integration required');
    }

    if (trigger.length === 2) {
      return await client.automation.update({
        where: { id: automationId },
        data: {
          trigger: {
            createMany: {
              data: [{ type: trigger[0] }, { type: trigger[1] }]
            }
          }
        }
      });
    }

    return await client.automation.update({
      where: { id: automationId },
      data: {
        trigger: {
          create: { type: trigger[0] }
        }
      }
    });
  } catch (error) {
    console.error('Add trigger error:', error);
    throw error;
  }
};

export const addKeyWord = async (automationId: string, keyword: string) => {
  try {
    const automation = await client.automation.findUnique({
      where: { id: automationId },
      select: { User: { select: { id: true } } }
    });

    const integration = await validateIntegration(automation?.User?.id || '');
    if (!integration) {
      throw new Error('Valid Instagram integration required');
    }

    return client.automation.update({
      where: { id: automationId },
      data: {
        keywords: {
          create: { word: keyword }
        }
      }
    });
  } catch (error) {
    console.error('Add keyword error:', error);
    throw error;
  }
};

export const deleteKeywordQuery = async (id: string) => {
  try {
    return client.keyword.delete({
      where: { id }
    });
  } catch (error) {
    console.error('Delete keyword error:', error);
    throw error;
  }
};

export const addPost = async (
  automationId: string,
  posts: {
    postid: string
    caption?: string
    media: string
    mediaType: 'IMAGE' | 'VIDEO' | 'CAROSEL_ALBUM'
  }[]
) => {
  try {
    const automation = await client.automation.findUnique({
      where: { id: automationId },
      select: { User: { select: { id: true } } }
    });

    const integration = await validateIntegration(automation?.User?.id || '');
    if (!integration) {
      throw new Error('Valid Instagram integration required');
    }

    return await client.$transaction(async (tx) => {
      return await tx.automation.update({
        where: { id: automationId },
        data: {
          posts: {
            createMany: {
              data: posts
            }
          }
        }
      });
    });
  } catch (error) {
    console.error('Add posts error:', error);
    throw error;
  }
};