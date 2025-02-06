import { client } from '@/lib/prisma'

// Update the Instagram integration
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
  })
}

// Get existing Instagram integration for a user
export const getIntegration = async (userId: string) => {
  return await client.user.findUnique({
    where: {
      id: userId, // Ensure we're fetching based on userId
    },
    select: {
      integrations: {
        where: {
          name: 'INSTAGRAM',
        },
      },
    },
  })
}

// Create a new Instagram integration for the user
export const createIntegration = async (
  userId: string,
  token: string,
  expire: Date,
  igId?: string
) => {
  return await client.user.update({
    where: {
      id: userId, // Ensure we're using userId here
    },
    data: {
      integrations: {
        create: {
          token,
          expiresAt: expire,
          instagramId: igId,
        },
      },
    },
    select: {
      firstname: true,
      lastname: true,
    },
  })
}
