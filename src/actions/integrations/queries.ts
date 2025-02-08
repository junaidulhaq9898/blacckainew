import { client } from '@/lib/prisma'
import { INTEGRATIONS } from '@prisma/client'

const isValidUUID = (str: string) => 
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(str)

interface CreateIntegrationParams {
  userId: string
  token: string
  expire: Date
  instagramId?: string
}

export const createIntegration = async ({
  userId,
  token,
  expire,
  instagramId
}: CreateIntegrationParams) => {
  if (!isValidUUID(userId)) throw new Error('Invalid UUID for user ID')

  const result = await client.user.update({
    where: { id: userId },
    data: {
      integrations: {
        create: {
          name: INTEGRATIONS.INSTAGRAM,
          token,
          expiresAt: expire,
          instagramId
        }
      }
    },
    select: { 
      firstname: true, 
      lastname: true,
      integrations: {
        where: { name: INTEGRATIONS.INSTAGRAM },
        orderBy: { createdAt: 'desc' },
        take: 1
      }
    }
  })

  return {
    firstname: result.firstname,
    lastname: result.lastname,
    integration: result.integrations[0]
  }
}

export const getIntegration = async (userId: string) => {
  if (!isValidUUID(userId)) throw new Error('Invalid UUID for user ID')

  return client.user.findUnique({
    where: { id: userId },
    select: {
      integrations: {
        where: { name: INTEGRATIONS.INSTAGRAM }
      }
    }
  })
}