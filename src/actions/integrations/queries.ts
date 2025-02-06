import { client } from '@/lib/prisma';

// Update integration
export const updateIntegration = async (
  token: string,
  expire: Date,
  id: string
) => {
  return await client.integrations.update({
    where: { id },
    data: {
      token,
      expiresAt: expire,
    },
  });
};

// Get user's integrations
export const getIntegration = async (userId: string) => {
  return await client.user.findUnique({
    where: { id: userId },
    select: {
      integrations: {
        where: { name: 'INSTAGRAM' },
      },
    },
  });
};

// Create integration (FIXED)
export const createIntegration = async (
  userId: string,
  token: string,
  expire: Date,
  igId?: string
) => {
  return await client.user.update({
    where: { id: userId },
    data: {
      integrations: {
        create: {
          token,
          expiresAt: expire,
          instagramId: igId,
          name: 'INSTAGRAM', // Explicitly set integration name
        },
      },
    },
    select: {
      id: true, // Only return non-unique fields
      integrations: true,
    },
  });
};