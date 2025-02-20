// fetch.ts

import axios from 'axios'

/**
 * Generates tokens and fetches the Instagram Business Account ID using the Instagram Graph API.
 * @param code The authorization code from the Instagram authentication callback.
 * @returns An object with the Instagram Business Account ID and long-lived access token.
 */
export const generateTokens = async (code: string) => {
  try {
    // Validate environment variables
    if (!process.env.INSTAGRAM_CLIENT_ID) {
      throw new Error('INSTAGRAM_CLIENT_ID is not defined in environment variables.')
    }
    if (!process.env.INSTAGRAM_CLIENT_SECRET) {
      throw new Error('INSTAGRAM_CLIENT_SECRET is not defined in environment variables.')
    }
    if (!process.env.NEXT_PUBLIC_HOST_URL) {
      throw new Error('NEXT_PUBLIC_HOST_URL is not defined in environment variables.')
    }
    if (!process.env.INSTAGRAM_BASE_URL) {
      throw new Error('INSTAGRAM_BASE_URL is not defined in environment variables.')
    }

    // Step 1: Get the short-lived access token
    const instaForm = new FormData()
    instaForm.append('client_id', process.env.INSTAGRAM_CLIENT_ID)
    instaForm.append('client_secret', process.env.INSTAGRAM_CLIENT_SECRET)
    instaForm.append('grant_type', 'authorization_code')
    instaForm.append('redirect_uri', `${process.env.NEXT_PUBLIC_HOST_URL}/callback/instagram`)
    instaForm.append('code', code)

    console.log('Requesting short-lived token with params:', {
      client_id: process.env.INSTAGRAM_CLIENT_ID,
      client_secret: process.env.INSTAGRAM_CLIENT_SECRET ? '[REDACTED]' : undefined,
      redirect_uri: `${process.env.NEXT_PUBLIC_HOST_URL}/callback/instagram`,
      code,
    })

    const shortTokenRes = await fetch('https://graph.instagram.com/oauth/access_token', {
      method: 'POST',
      body: instaForm,
    })

    if (!shortTokenRes.ok) {
      const errorText = await shortTokenRes.text()
      console.error('Short-lived token fetch failed:', shortTokenRes.status, errorText)
      throw new Error(`Failed to fetch short-lived token: ${shortTokenRes.statusText} - ${errorText}`)
    }

    const shortTokenText = await shortTokenRes.text()
    const shortTokenData = JSON.parse(shortTokenText, (key, value) => {
      if (key === 'user_id') return String(value)
      return value
    })

    console.log('Short-lived token response:', shortTokenData)

    const shortAccessToken = shortTokenData.access_token
    const basicUserId = shortTokenData.user_id

    // Step 2: Exchange for a long-lived token
    const longTokenRes = await axios.get(
      `${process.env.INSTAGRAM_BASE_URL}/access_token?grant_type=ig_exchange_token&client_secret=${process.env.INSTAGRAM_CLIENT_SECRET}&access_token=${shortAccessToken}`
    )

    console.log('Long-lived token response:', longTokenRes.data)

    const longAccessToken = longTokenRes.data.access_token
    const expiresIn = longTokenRes.data.expires_in

    // Step 3: Get the Instagram Business Account ID
    const igUserRes = await axios.get(
      `${process.env.INSTAGRAM_BASE_URL}/me?fields=id,username,account_type,instagram_business_account&access_token=${longAccessToken}`
    )

    const igData = igUserRes.data
    console.log('Instagram account data:', igData)

    if (!igData.instagram_business_account || !igData.instagram_business_account.id) {
      throw new Error('No Instagram Business Account found. Ensure the account is a Business or Creator account linked to a Facebook Page.')
    }

    const igBusinessId = igData.instagram_business_account.id

    return {
      user_id: igBusinessId,
      access_token: longAccessToken,
      expires_in: expiresIn,
    }
  } catch (error) {
    console.error('Error in generateTokens:', error)
    throw error
  }
}

export const refreshToken = async (token: string) => {
  const refresh_token = await axios.get(
    `${process.env.INSTAGRAM_BASE_URL}/refresh_access_token?grant_type=ig_refresh_token&access_token=${token}`
  )
  return refresh_token.data
}

export const sendDM = async (
  userId: string,
  receiverId: string,
  prompt: string,
  token: string
) => {
  console.log('Sending message...')
  return await axios.post(
    `${process.env.INSTAGRAM_BASE_URL}/v21.0/${userId}/messages`,
    {
      recipient: { id: receiverId },
      message: { text: prompt },
    },
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    }
  )
}

export const sendPrivateMessage = async (
  userId: string,
  receiverId: string,
  prompt: string,
  token: string
) => {
  console.log('Sending private message...')
  return await axios.post(
    `${process.env.INSTAGRAM_BASE_URL}/${userId}/messages`,
    {
      recipient: { id: receiverId },
      message: { text: prompt },
    },
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    }
  )
}

export default {
  refreshToken,
  sendDM,
  sendPrivateMessage,
  generateTokens,
}