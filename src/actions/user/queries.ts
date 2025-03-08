// src/actions/user/queries.ts
'use server';
import { client } from '@/lib/prisma';
import { SUBSCRIPTION_PLAN } from '@prisma/client';

interface SubscriptionUpdate {
  customerId: string;
  plan: SUBSCRIPTION_PLAN;
}

const validateUserData = (
  clerkId: string,
  firstName: string,
  lastName: string,
  email: string
) => {
  if (!clerkId) throw new Error('ClerkId is required');
  if (!email) throw new Error('Email is required');
  if (!firstName && !lastName) throw new Error('At least one name is required');
  return true;
};

const getIntegrationStatus = async (userId: string) => {
  const integration = await client.integrations.findFirst({
    where: {
      userId,
      name: 'INSTAGRAM',
      expiresAt: { gt: new Date() },
    },
  });

  return {
    hasValidIntegration: !!integration,
    integration,
  };
};

export const createUser = async (
  clerkId: string,
  firstName: string,
  lastName: string,
  email: string
) => {
  try {
    validateUserData(clerkId, firstName, lastName, email);

    return await client.user.create({
      data: {
        clerkId,
        email,
        firstname: firstName,
        lastname: lastName,
        subscription: {
          create: { plan: 'FREE' },
        },
      },
      include: {
        subscription: true,
        integrations: true,
      },
    });
  } catch (error) {
    console.error('Create user error:', error);
    throw error;
  }
};

export const upsertUser = async (
  clerkId: string,
  firstName: string,
  lastName: string,
  email: string
) => {
  try {
    validateUserData(clerkId, firstName, lastName, email);

    const user = await client.user.upsert({
      where: { clerkId },
      update: {
        firstname: firstName,
        lastname: lastName,
        email,
      },
      create: {
        clerkId,
        email,
        firstname: firstName,
        lastname: lastName,
        subscription: {
          create: { plan: 'FREE' },
        },
      },
      include: {
        subscription: true,
        integrations: { orderBy: { createdAt: 'desc' } },
        automations: {
          include: {
            keywords: true,
            trigger: true,
            listener: true,
          },
        },
      },
    });

    const { hasValidIntegration, integration } = await getIntegrationStatus(user.id);

    return {
      ...user,
      integrationStatus: {
        hasValidIntegration,
        integrationId: integration?.id,
        expiresAt: integration?.expiresAt,
        needsRefresh: integration?.expiresAt
          ? (integration.expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24) <= 5
          : false,
      },
    };
  } catch (error) {
    console.error('Upsert user error:', error);
    throw error;
  }
};

export const findUser = async (clerkId: string) => {
  try {
    const user = await client.user.findUnique({
      where: { clerkId },
      include: {
        subscription: true,
        integrations: { orderBy: { createdAt: 'desc' } },
        automations: {
          include: {
            keywords: true,
            trigger: true,
            listener: true,
          },
        },
      },
    });

    if (!user) return null;

    const { hasValidIntegration, integration } = await getIntegrationStatus(user.id);

    return {
      ...user,
      integrationStatus: {
        hasValidIntegration,
        integrationId: integration?.id,
        expiresAt: integration?.expiresAt,
        needsRefresh: integration?.expiresAt
          ? (integration.expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24) <= 5
          : false,
      },
    };
  } catch (error) {
    console.error('Find user error:', error);
    throw error;
  }
};

// src/actions/user/queries.ts
export const updateSubscription = async (userId: string, data: SubscriptionUpdate) => {
  try {
    // Check if the subscription already exists
    const existingSubscription = await client.subscription.findUnique({ where: { userId } });
    console.log('Existing subscription:', existingSubscription);

    // Upsert the subscription (create if it doesn't exist, update if it does)
    const updatedSubscription = await client.subscription.upsert({
      where: { userId },
      create: {
        userId,
        customerId: data.customerId,
        plan: data.plan,
      },
      update: {
        customerId: data.customerId,
        plan: data.plan,
      },
    });
    console.log('Updated subscription:', updatedSubscription);
    return updatedSubscription;
  } catch (error) {
    console.error('Update subscription error:', error);
    throw error;
  }
};

export const getUserAutomations = async (userId: string) => {
  try {
    const { hasValidIntegration } = await getIntegrationStatus(userId);

    if (!hasValidIntegration) {
      throw new Error('Valid Instagram integration required');
    }

    return await client.automation.findMany({
      where: { userId },
      include: {
        keywords: true,
        trigger: true,
        listener: true,
        posts: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  } catch (error) {
    console.error('Get user automations error:', error);
    throw error;
  }
};

export const updateUserProfile = async (
  userId: string,
  data: { firstName?: string; lastName?: string; email?: string }
) => {
  try {
    return await client.user.update({
      where: { id: userId },
      data: {
        firstname: data.firstName,
        lastname: data.lastName,
        email: data.email,
      },
    });
  } catch (error) {
    console.error('Update user profile error:', error);
    throw error;
  }
};

export const getUserStats = async (userId: string) => {
  try {
    const { hasValidIntegration } = await getIntegrationStatus(userId);

    if (!hasValidIntegration) {
      throw new Error('Valid Instagram integration required');
    }

    const [automations, keywords, posts] = await client.$transaction([
      client.automation.count({ where: { userId } }),
      client.keyword.count({
        where: { Automation: { userId } },
      }),
      client.post.count({
        where: { Automation: { userId } },
      }),
    ]);

    return {
      totalAutomations: automations,
      totalKeywords: keywords,
      totalPosts: posts,
    };
  } catch (error) {
    console.error('Get user stats error:', error);
    throw error;
  }
};

export const deleteUser = async (userId: string) => {
  try {
    await client.$transaction([
      client.automation.deleteMany({ where: { userId } }),
      client.integrations.deleteMany({ where: { userId } }),
      client.subscription.delete({ where: { userId } }),
      client.user.delete({ where: { id: userId } }),
    ]);
    return true;
  } catch (error) {
    console.error('Delete user error:', error);
    throw error;
  }
};