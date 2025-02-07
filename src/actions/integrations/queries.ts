import { client } from '@/lib/prisma'

// Regular expression to check if a string is a valid UUID
const isValidUUID = (str: string) => {
  const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
  return uuidRegex.test(str);
}

// Update the Instagram integration
export const updateIntegration = async (
  token: string,
  expire: Date,
  id: string
) => {
  if (!isValidUUID(id)) {
    throw new Error('Invalid UUID for integration update')
  }

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
  if (!isValidUUID(userId)) {
    throw new Error('Invalid UUID for user ID')
  }

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
  if (!isValidUUID(userId)) {
    throw new Error('Invalid UUID for user ID')
  }

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
