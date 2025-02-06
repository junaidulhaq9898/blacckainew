'use server'

import { redirect } from 'next/navigation'
import { onCurrentUser } from '../user'
import { createIntegration, getIntegration } from './queries'
import { generateTokens } from '@/lib/fetch'
import axios from 'axios'

// Initiates Instagram OAuth flow.
export const onOAuthInstagram = (strategy: 'INSTAGRAM' | 'CRM') => {
  if (strategy === 'INSTAGRAM') {
    // Redirect to Instagram OAuth URL
    return redirect(process.env.INSTAGRAM_EMBEDDED_OAUTH_URL as string)
  }
}

// Handles the callback after Instagram OAuth authorization.
export const onIntegrate = async (code: string) => {
  const user = await onCurrentUser()

  // Ensure we have a valid user object
  if (!user || !user.id) {
    console.error('User not found or missing user ID')
    return { status: 400, message: 'User not found or missing user ID' }
  }

  try {
    // Get the user's integrations
    const integration = await getIntegration(user.id)

    if (integration && integration.integrations.length > 0) {
      console.log('Instagram integration already exists.')
      return { status: 200, message: 'Integration already exists' }
    }

    // Generate token using the authorization code
    const token = await generateTokens(code)
    console.log('Generated Token:', token)

    if (token) {
      // Fetch Instagram user ID
      const insta_id = await axios.get(
        `${process.env.INSTAGRAM_BASE_URL}/me?fields=id&access_token=${token.access_token}`
      )
      console.log('Instagram User ID:', insta_id.data.id)

      // Set token expiry date
      const expire_date = new Date()
      expire_date.setDate(expire_date.getDate() + 60) // Token expiry date (60 days)

      // Store the integration in the database
      const create = await createIntegration(
        user.id, // Using user.id instead of clerkId
        token.access_token,
        expire_date,
        insta_id.data.id
      )
      console.log('Integration successfully stored in the database:', create)

      // Redirect after successful integration
      return { status: 200, data: create }
    } else {
      console.error('Token generation failed')
      return { status: 401, message: 'Token generation failed' }
    }
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error('Error during integration:', error.message)
      return { status: 500, message: error.message }
    } else {
      console.error('Unknown error during integration')
      return { status: 500, message: 'Unknown error' }
    }
  }
}
