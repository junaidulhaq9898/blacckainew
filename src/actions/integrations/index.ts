'use server'

import { redirect } from 'next/navigation'
import { onCurrentUser } from '../user'
import { createIntegration, getIntegration } from './queries'
import { generateTokens } from '@/lib/fetch'
import axios from 'axios'

export const onOAuthInstagram = (strategy: 'INSTAGRAM' | 'CRM') => {
  if (strategy === 'INSTAGRAM') {
    return redirect(process.env.INSTAGRAM_EMBEDDED_OAUTH_URL as string)
  }
}

export const onIntegrate = async (code: string) => {
  const user = await onCurrentUser()

  try {
    // Get the user's integrations
    const integration = await getIntegration(user.id)

    // If no integration exists, generate the token
    if (integration && integration.integrations.length === 0) {
      const token = await generateTokens(code) // Token exchange
      console.log('Generated Token:', token)

      if (token) {
        // Fetch Instagram user ID
        const insta_id = await axios.get(
          `${process.env.INSTAGRAM_BASE_URL}/me?fields=id&access_token=${token.access_token}`
        )
        console.log('Instagram User ID:', insta_id.data.id)

        // Set token expiry date
        const today = new Date()
        const expire_date = new Date()
        expire_date.setDate(expire_date.getDate() + 60) // Token expiry date

        // Store the integration in the database
        const create = await createIntegration(
          user.id,
          token.access_token,
          expire_date,
          insta_id.data.id
        )
        return { status: 200, data: create }
      }

      console.log('🔴 Token generation failed')
      return { status: 401, message: 'Token generation failed' }
    }

    console.log('🔴 No integrations found')
    return { status: 404 }
  } catch (error: unknown) {
    // Type the error as an instance of Error
    if (error instanceof Error) {
      console.error('🔴 Error during integration:', error.message)
      return { status: 500, message: error.message }
    } else {
      // Handle unknown errors
      console.error('🔴 Unknown error during integration')
      return { status: 500, message: 'Unknown error' }
    }
  }
}
