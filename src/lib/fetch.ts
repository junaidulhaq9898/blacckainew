// fetch.ts

import axios from 'axios'

/**
 * Refreshes an Instagram access token to obtain a long-lived token.
 * @param token The short-lived access token.
 * @returns The refreshed token data.
 */
export const refreshToken = async (token: string) => {
  const refresh_token = await axios.get(
    `${process.env.INSTAGRAM_BASE_URL}/refresh_access_token?grant_type=ig_refresh_token&access_token=${token}`
  )
  return refresh_token.data
}

/**
 * Sends a direct message using the Instagram Graph API.
 * @param userId The Instagram Business Account ID (sender).
 * @param receiverId The recipient's Instagram user ID.
 * @param prompt The message text.
 * @param token The access token.
 * @returns The Axios response.
 */
export const sendDM = async (
  userId: string,
  receiverId: string,
  prompt: string,
  token: string
) => {
  console.log('Sending message...')
  try {
    const response = await axios.post(
      `${process.env.INSTAGRAM_BASE_URL}/v21.0/${userId}/messages`,
      {
        recipient: {
          id: receiverId,
        },
        message: {
          text: prompt,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    )
    return response
  } catch (error) {
    console.error('Error sending DM:', error)
    throw error
  }
}

/**
 * Generates tokens and fetches the Instagram Business Account ID using the Instagram Graph API.
 * @param code The authorization code from the Instagram authentication callback.
 * @returns An object with the Instagram Business Account ID and long-lived access token.
 */
export const generateTokens = async (code: string) => {
  // Step 1: Get the short-lived access token from Facebook Login (Instagram Graph API flow)
  const instaForm = new FormData()
  instaForm.append('client_id', process.env.INSTAGRAM_APP_ID as string)
  instaForm.append('client_secret', process.env.INSTAGRAM_APP_SECRET as string)
  instaForm.append('grant_type', 'authorization_code')
  instaForm.append('redirect_uri', `${process.env.NEXT_PUBLIC_HOST_URL}/callback/instagram`)
  instaForm.append('code', code)

  const shortTokenRes = await fetch('https://graph.instagram.com/oauth/access_token', {
    method: 'POST',
    body: instaForm,
  })

  if (!shortTokenRes.ok) {
    throw new Error(`Failed to fetch short-lived token: ${shortTokenRes.statusText}`)
  }

  // Parse response and ensure user_id is a string
  const shortTokenText = await shortTokenRes.text()
  const shortTokenData = JSON.parse(shortTokenText, (key, value) => {
    if (key === 'user_id') return String(value) // Force user_id to string
    return value
  })

  const shortAccessToken = shortTokenData.access_token
  const basicUserId = shortTokenData.user_id // This is the Basic Display API user ID, not usable for messaging yet

  console.log('Short-lived token data:', shortTokenData)

  // Step 2: Exchange for a long-lived token
  const longTokenRes = await axios.get(
    `${process.env.INSTAGRAM_BASE_URL}/access_token?grant_type=ig_exchange_token&client_secret=${process.env.INSTAGRAM_APP_SECRET}&access_token=${shortAccessToken}`
  )

  const longAccessToken = longTokenRes.data.access_token
  const expiresIn = longTokenRes.data.expires_in

  // Step 3: Get the Instagram Business Account ID using the long-lived token
  const igUserRes = await axios.get(
    `${process.env.INSTAGRAM_BASE_URL}/me?fields=id,username,account_type,instagram_business_account&access_token=${longAccessToken}`
  )

  const igData = igUserRes.data
  if (!igData.instagram_business_account || !igData.instagram_business_account.id) {
    throw new Error(
      'No Instagram Business Account found. Ensure the account is a Business or Creator account linked to a Facebook Page.'
    )
  }

  const igBusinessId = igData.instagram_business_account.id // Correct ID for messaging

  console.log('Instagram Business Account ID:', igBusinessId)

  // Return the Instagram Business Account ID and long-livedtoken
  return {
    user_id: igBusinessId, // String like "17841466961638820"
    access_token: longAccessToken,
    expires_in: expiresIn,
  }
}

/**
 * Sends a private message (alternative implementation, if needed).
 * Note: This seems redundant with sendDM; you may not need it.
 */
export const sendPrivateMessage = async (
  userId: string,
  receiverId: string,
  prompt: string,
  token: string
) => {
  console.log('Sending private message...')
  try {
    const response = await axios.post(
      `${process.env.INSTAGRAM_BASE_URL}/${userId}/messages`,
      {
        recipient: {
          id: receiverId, // Adjusted to match sendDM structure
        },
        message: {
          text: prompt,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    )
    return response
  } catch (error) {
    console.error('Error sending private message:', error)
    throw error
  }
}

export default {
  refreshToken,
  sendDM,
  sendPrivateMessage,
  generateTokens,
}