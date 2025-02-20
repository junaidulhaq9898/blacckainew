import { client } from '@/lib/prisma'
import { INTEGRATIONS } from '@prisma/client'


// Inline helper for UUID validation.
const isValidUUID = (str: string): boolean =>
 /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(str)


interface CreateIntegrationParams {
 userId: string
 token: string
 expire: Date
 instagramId?: string
}


/**
* Creates an integration record by updating the user record.
* Returns selected user fields.
*/
export const createIntegration = async ({
 userId,
 token,
 expire,
 instagramId,
}: CreateIntegrationParams) => {
 if (!isValidUUID(userId)) throw new Error('Invalid UUID for user ID')


 return client.user.update({
   where: { id: userId },
   data: {
     integrations: {
       create: {
         name: INTEGRATIONS.INSTAGRAM,
         token,
         expiresAt: expire,
         instagramId,
       },
     },
   },
   select: {
     firstname: true,
     lastname: true,
   },
 })
}


/**
* Updates an existing integration record.
*/
export const updateIntegration = async (
 token: string,
 expire: Date,
 id: string
) => {
 if (!isValidUUID(id)) throw new Error('Invalid UUID for integration update')


 return client.integrations.update({
   where: { id },
   data: { token, expiresAt: expire },
 })
}


/**
* Retrieves the Instagram integration for a given user.
*/
export const getIntegration = async (userId: string) => {
 if (!isValidUUID(userId)) throw new Error('Invalid UUID for user ID')


 return client.user.findUnique({
   where: { id: userId },
   select: {
     integrations: {
       where: { name: INTEGRATIONS.INSTAGRAM },
     },
   },
 })
}
