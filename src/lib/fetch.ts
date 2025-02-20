// fetch.ts

import axios from 'axios'

/**
 * Generates a Facebook access token and fetches the Instagram Business Account ID.
 * @param code The authorization code received from the Facebook Login callback.
 * @returns An object containing the Instagram Business Account ID and access token.
 */
export const generateTokens = async (code: string) => {
  // Step 1: Get the Facebook access token
  const fbForm = new FormData()
  fbForm.append('client_id', process.env.FACEBOOK_APP_ID as string)
  fbForm.append('client_secret', process.env.FACEBOOK_APP_SECRET as string)
  fbForm.append('grant_type', 'authorization_code')
  fbForm.append('redirect_uri', `${process.env.NEXT_PUBLIC_HOST_URL}/callback/instagram`)
  fbForm.append('code', code)

  const tokenRes = await fetch('https://graph.facebook.com/v21.0/oauth/access_token', {
    method: 'POST',
    body: fbForm,
  })

  if (!tokenRes.ok) {
    throw new Error(`Failed to fetch Facebook access token: ${tokenRes.statusText}`)
  }

  const tokenData = await tokenRes.json()
  const accessToken = tokenData.access_token

  // Step 2: Get the user's Facebook Pages
  const pagesRes = await fetch(
    `https://graph.facebook.com/v21.0/me/accounts?access_token=${accessToken}`
  )
  if (!pagesRes.ok) {
    throw new Error(`Failed to fetch Facebook Pages: ${pagesRes.statusText}`)
  }

  const pagesData = await pagesRes.json()
  if (!pagesData.data || pagesData.data.length === 0) {
    throw new Error('No Facebook Pages found for this user.')
  }

  // Step 3: Get the Instagram Business Account ID from the first page
  // Note: If the user manages multiple pages, you may need logic to select the correct one.
  const pageId = pagesData.data[0].id
  const igRes = await fetch(
    `https://graph.facebook.com/v21.0/${pageId}?fields=instagram_business_account&access_token=${accessToken}`
  )
  if (!igRes.ok) {
    throw new Error(`Failed to fetch Instagram Business Account: ${igRes.statusText}`)
  }

  const igData = await igRes.json()
  if (!igData.instagram_business_account || !igData.instagram_business_account.id) {
    throw new Error('No Instagram Business Account connected to this Facebook Page.')
  }

  const igUserId = igData.instagram_business_account.id // This is a string

  // Return the Instagram Business Account ID and access token
  return {
    user_id: igUserId,
    access_token: accessToken,
  }
}

/**
 * Sends a direct message using the Instagram Graph API.
 * @param userId The Instagram Business Account ID (sender).
 * @param receiverId The recipient's Instagram user ID.
 * @param prompt The message text.
 * @param token The Facebook access token.
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

export default {
  generateTokens,
  sendDM,
}