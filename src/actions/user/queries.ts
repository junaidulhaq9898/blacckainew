// /src/actions/user/queries.ts
import { client } from '@/lib/prisma'
import type { User, Integrations, Subscription } from '@prisma/client'

/**
 * Finds a user by their Clerk ID and includes integrations and subscription.
 */
export const findUser = async (
  clerkId: string
): Promise<
  (User & { integrations: Integrations[]; subscription: Subscription | null }) | null
> => {
  return client.user.findUnique({
    where: { clerkId },
    include: { 
      integrations: true,
      subscription: true 
    }
  })
}

/**
 * Creates a new user.
 */
export const createUser = async (
  clerkId: string,
  firstName: string,
  lastName: string,
  email: string
) => {
  return client.user.create({
    data: {
      clerkId,
      firstname: firstName,
      lastname: lastName,
      email,
    }
  })
}

/**
 * Updates the user's subscription.
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
