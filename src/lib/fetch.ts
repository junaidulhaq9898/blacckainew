import axios from 'axios'

/**
 * Refreshes an existing Instagram access token. 
 * If you do not need token refreshing, remove this function and references to it.
 */
export const refreshToken = async (token: string) => {
  const refresh_token = await axios.get(
    `${process.env.INSTAGRAM_BASE_URL}/refresh_access_token?grant_type=ig_refresh_token&access_token=${token}`
  )

  // refresh_token.data will include the new access token details
  return refresh_token.data
}

/**
 * Exchanges the given code for short-lived tokens, then fetches a long-lived token.
 */
export const generateTokens = async (code: string) => {
  const insta_form = new FormData()
  insta_form.append('client_id', process.env.INSTAGRAM_CLIENT_ID as string)
  insta_form.append('client_secret', process.env.INSTAGRAM_CLIENT_SECRET as string)
  insta_form.append('grant_type', 'authorization_code')
  insta_form.append(
    'redirect_uri',
    `${process.env.NEXT_PUBLIC_HOST_URL}/callback/instagram`
  )
  insta_form.append('code', code)

  // Exchange the code for a short-lived token
  const shortTokenRes = await fetch(process.env.INSTAGRAM_TOKEN_URL as string, {
    method: 'POST',
    body: insta_form,
  })

  const token = await shortTokenRes.json()
  console.log('Short token response:', token)

  // Safely check if permissions is an array to avoid reading length on undefined
  if (Array.isArray(token.permissions) && token.permissions.length > 0) {
    console.log('Permissions detected:', token.permissions)
    console.log('Access token:', token.access_token)

    // Exchange short-lived token for a long-lived token
    const long_token = await axios.get(
      `${process.env.INSTAGRAM_BASE_URL}/access_token?grant_type=ig_exchange_token&client_secret=${process.env.INSTAGRAM_CLIENT_SECRET}&access_token=${token.access_token}`
    )

    return long_token.data
  }

  // If no permissions array or it's empty, return null (or handle accordingly)
  console.warn('No permissions array found or it is empty. Token object:', token)
  return null
}

/**
 * Sends a direct message (DM) to a specific user on Instagram.
 */
export const sendDM = async (
  userId: string,
  recieverId: string,
  prompt: string,
  token: string
) => {
  return await axios.post(
    `${process.env.INSTAGRAM_BASE_URL}/v21.0/${userId}/messages`,
    {
      recipient: {
        id: recieverId,
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
}

/**
 * Sends a private message in response to a comment on Instagram.
 */
export const sendPrivateMessage = async (
  userId: string,
  recieverId: string,
  prompt: string,
  token: string
) => {
  return await axios.post(
    `${process.env.INSTAGRAM_BASE_URL}/${userId}/messages`,
    {
      recipient: {
        comment_id: recieverId,
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
}
