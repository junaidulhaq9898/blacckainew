// /src/actions/user/queries.ts
import { client } from '@/lib/prisma'
import type { User, Integrations } from '@prisma/client'

/**
 * Find a user by their Clerk ID.
 * Include the integrations relation so that we have access to the integrations.
 */
export const findUser = async (
  clerkId: string
): Promise<(User & { integrations: Integrations[] }) | null> => {
  return client.user.findUnique({
    where: { clerkId },
    include: { integrations: true } // include integrations so TS knows about it
  })
}

/**
 * Create a new user in the database.
 * The database will generate the UUID.
 */
export const createUser = async (
  clerkId: string,
  firstName: string,
  lastName: string,
  email: string
): Promise<User> => {
  return client.user.create({
    data: {
      clerkId,
      firstname: firstName,
      lastname: lastName,
      email
    }
  })
}

/**
 * Update the user's subscription.
 * This uses the DB user's UUID (found via clerkId) to update the Subscription record.
 */
export const updateSubscription = async (
  userId: string,
  data: { customerId: string; plan: 'PRO' | 'FREE' }
) => {
  return client.subscription.update({
    where: { userId },
    data
  })
}
