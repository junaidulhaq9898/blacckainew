'use server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import axios from 'axios'
import { generateTokens } from '@/lib/fetch'
import { onCurrentUser } from '../user'
import { findUser } from '../user/queries' // Import the DB lookup helper
import { createIntegration, getIntegration } from './queries'

export const onOAuthInstagram = (strategy: 'INSTAGRAM' | 'CRM') => {
  if (strategy !== 'INSTAGRAM') throw new Error('Invalid integration strategy')
  
  const oauthUrl = process.env.INSTAGRAM_EMBEDDED_OAUTH_URL
  if (!oauthUrl) throw new Error('Instagram OAuth URL not configured')
  
  return redirect(oauthUrl)
}

export const onIntegrate = async (code: string) => {
  try {
    // Get the authenticated Clerk user
    const clerkUser = await onCurrentUser()
    if (!clerkUser?.id) throw new Error('User not authenticated')

    // Look up the corresponding DB user record using the Clerk ID
    const userRecord = await findUser(clerkUser.id)
    if (!userRecord?.id) throw new Error('User record not found')

    // Use the database user's UUID for integration operations
    const existing = await getIntegration(userRecord.id)
    if (existing?.integrations?.length) {
      revalidatePath('/integrations')
      return { success: 'Integration exists' }
    }

    // Exchange the provided code for tokens
    const token = await generateTokens(code)
    if (!token?.access_token) throw new Error('Failed to get access token')

    // Retrieve the Instagram user id using the access token
    const { data } = await axios.get<{ id: string }>(
      `${process.env.INSTAGRAM_BASE_URL}/me`,
      { params: { fields: 'id', access_token: token.access_token } }
    )

    // Set token expiry to 60 days from now
    const expireDate = new Date()
    expireDate.setDate(expireDate.getDate() + 60)

    // Create the integration record in the database using the DB user's UUID
    const integrationResult = await createIntegration({
      userId: userRecord.id, // now a valid UUID from your DB
      token: token.access_token,
      expire: expireDate,
      instagramId: data.id
    })

    revalidatePath('/integrations')
    return { 
      success: true,
      data: {
        name: [integrationResult.firstname, integrationResult.lastname]
          .filter(Boolean)
          .join(' ')
      }
    }
    
  } catch (error: any) {
    console.error('Integration failed:', error)
    return {
      error: error.response?.data?.message ||
             error.message ||
             'Failed to complete Instagram integration'
    }
  }
}
