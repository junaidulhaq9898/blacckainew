'use server'
import { currentUser } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { createUser, findUser, updateSubscription } from './queries'
import { refreshToken } from '@/lib/fetch'
import { updateIntegration } from '@/actions/integrations/queries'
import { stripe } from '@/lib/stripe'

// Types
interface UserResponse<T> {
  status: number;
  data?: T;
  error?: string;
}

export const onCurrentUser = async () => {
  const user = await currentUser()
  if (!user) return redirect('/sign-in')
  return user
}

export const onBoardUser = async (): Promise<UserResponse<any>> => {
  const clerkUser = await onCurrentUser()
  try {
    const found = await findUser(clerkUser.id)
    if (found) {
      if (found.integrations && found.integrations.length > 0) {
        const today = new Date()
        const expiresAt = found.integrations[0].expiresAt
        
        if (expiresAt) {
          const time_left = expiresAt.getTime() - today.getTime()
          const days = Math.round(time_left / (1000 * 3600 * 24))
          
          if (days < 5) {
            console.log('Refreshing token...')
            const refresh = await refreshToken(found.integrations[0].token)
            const expire_date = new Date()
            expire_date.setDate(expire_date.getDate() + 60)
            
            const update_token = await updateIntegration(
              refresh.access_token,
              expire_date,
              found.integrations[0].id
            )
            
            if (!update_token) {
              console.log('Update token failed')
            }
          }
        }
      }
      
      return {
        status: 200,
        data: {
          firstname: found.firstname,
          lastname: found.lastname,
          subscription: found.subscription,
          integrations: found.integrations
        }
      }
    }

    const created = await createUser(
      clerkUser.id,
      clerkUser.firstName!,
      clerkUser.lastName!,
      clerkUser.emailAddresses[0].emailAddress
    )

    return { 
      status: 201, 
      data: created 
    }
  } catch (error) {
    console.error('Onboard user error:', error)
    return { 
      status: 500,
      error: 'Failed to process user onboarding'
    }
  }
}

export const onUserInfo = async (): Promise<UserResponse<any>> => {
  const clerkUser = await onCurrentUser()
  try {
    const profile = await findUser(clerkUser.id)
    if (profile) {
      return { 
        status: 200, 
        data: profile 
      }
    }
    return { 
      status: 404,
      error: 'User profile not found'
    }
  } catch (error) {
    console.error('User info error:', error)
    return { 
      status: 500,
      error: 'Failed to retrieve user information'
    }
  }
}

export const onSubscribe = async (session_id: string): Promise<UserResponse<void>> => {
  const clerkUser = await onCurrentUser()
  try {
    const dbUser = await findUser(clerkUser.id)
    if (!dbUser) {
      return { 
        status: 404,
        error: 'User not found'
      }
    }

    const session = await stripe.checkout.sessions.retrieve(session_id)
    if (!session) {
      return { 
        status: 404,
        error: 'Session not found'
      }
    }

    const subscribed = await updateSubscription(dbUser.id, {
      customerId: session.customer as string,
      plan: 'PRO'
    })

    if (!subscribed) {
      return { 
        status: 401,
        error: 'Failed to update subscription'
      }
    }

    return { 
      status: 200 
    }
  } catch (error) {
    console.error('Subscription error:', error)
    return { 
      status: 500,
      error: 'Failed to process subscription'
    }
  }
}

// Added proper types and removed duplicate onSubscribe declaration