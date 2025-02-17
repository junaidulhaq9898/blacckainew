'use server'
import { client } from '@/lib/prisma'
import { INTEGRATIONS } from '@prisma/client'

// Interface for integration data
interface IntegrationData {
  userId: string
  token: string
  expire: Date
  instagramId: string
}

// Helper to validate Instagram ID uniqueness
const isInstagramIdUnique = async (instagramId: string): Promise<boolean> => {
  const existing = await client.integrations.findFirst({
    where: { instagramId }
  });
  return !existing;
};

// Helper to validate token
const validateToken = async (token: string): Promise<boolean> => {
  try {
    const response = await fetch(
      `${process.env.INSTAGRAM_BASE_URL}/me?access_token=${token}`
    );
    return response.status === 200;
  } catch (error) {
    console.error('Token validation error:', error);
    return false;
  }
};

export const createIntegration = async (data: IntegrationData) => {
  try {
    // Validate Instagram ID uniqueness
    const isUnique = await isInstagramIdUnique(data.instagramId);
    if (!isUnique) {
      throw new Error('Instagram account already connected');
    }

    // Validate token
    const isValid = await validateToken(data.token);
    if (!isValid) {
      throw new Error('Invalid Instagram token');
    }

    return await client.user.update({
      where: {
        id: data.userId,
      },
      data: {
        integrations: {
          create: {
            token: data.token,
            expiresAt: data.expire,
            instagramId: data.instagramId,
            name: INTEGRATIONS.INSTAGRAM,
          },
        },
      },
      select: {
        firstname: true,
        lastname: true,
        integrations: {
          where: {
            name: INTEGRATIONS.INSTAGRAM
          }
        }
      }
    })
  } catch (error) {
    console.error('Create integration error:', error);
    throw error;
  }
}

export const getIntegration = async (userId: string) => {
  try {
    return await client.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        integrations: {
          where: {
            name: INTEGRATIONS.INSTAGRAM
          }
        },
      },
    })
  } catch (error) {
    console.error('Get integration error:', error);
    throw error;
  }
}

export const updateIntegration = async (
  token: string,
  expiresAt: Date,
  integrationId: string
) => {
  try {
    // Validate new token
    const isValid = await validateToken(token);
    if (!isValid) {
      throw new Error('Invalid Instagram token');
    }

    return await client.integrations.update({
      where: {
        id: integrationId,
      },
      data: {
        token,
        expiresAt,
      },
    })
  } catch (error) {
    console.error('Update integration error:', error);
    throw error;
  }
}

export const deleteIntegration = async (integrationId: string) => {
  try {
    return await client.integrations.delete({
      where: {
        id: integrationId,
      },
    })
  } catch (error) {
    console.error('Delete integration error:', error);
    throw error;
  }
}

// Check if user has valid Instagram integration
export const hasValidInstagramIntegration = async (userId: string): Promise<boolean> => {
  try {
    const user = await client.user.findUnique({
      where: { id: userId },
      select: {
        integrations: {
          where: {
            AND: [
              { name: INTEGRATIONS.INSTAGRAM },
              { expiresAt: { gt: new Date() } }
            ]
          }
        }
      }
    });

    if (!user?.integrations?.[0]) {
      return false;
    }

    // Validate token is still valid with Instagram
    return await validateToken(user.integrations[0].token);
  } catch (error) {
    console.error('Integration validation error:', error);
    return false;
  }
};

// Get Instagram integration details
export const getInstagramIntegrationDetails = async (userId: string) => {
  try {
    const integration = await client.integrations.findFirst({
      where: {
        AND: [
          { userId },
          { name: INTEGRATIONS.INSTAGRAM }
        ]
      },
      select: {
        id: true,
        token: true,
        expiresAt: true,
        instagramId: true,
        createdAt: true
      }
    });

    if (!integration) {
      return null;
    }

    // Check if token is still valid
    const isValid = await validateToken(integration.token);
    
    return {
      ...integration,
      isValid,
      daysUntilExpiration: integration.expiresAt ? 
        Math.ceil((integration.expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : 
        0
    };
  } catch (error) {
    console.error('Get integration details error:', error);
    throw error;
  }
};

// Refresh Instagram token
export const refreshInstagramToken = async (integrationId: string) => {
  try {
    const integration = await client.integrations.findUnique({
      where: { id: integrationId }
    });

    if (!integration) {
      throw new Error('Integration not found');
    }

    // Call Instagram API to refresh token
    const response = await fetch(
      `${process.env.INSTAGRAM_BASE_URL}/refresh_access_token?grant_type=fb_exchange_token&access_token=${integration.token}`
    );
    
    const data = await response.json();
    if (!data.access_token) {
      throw new Error('Failed to refresh token');
    }

    // Update integration with new token
    const newExpiryDate = new Date();
    newExpiryDate.setDate(newExpiryDate.getDate() + 60); // 60 days from now

    return await updateIntegration(
      data.access_token,
      newExpiryDate,
      integrationId
    );
  } catch (error) {
    console.error('Token refresh error:', error);
    throw error;
  }
};