import axios from 'axios'

export const sendDM = async (params: {
  recipientId: string
  message: string
  token: string
}) => {
  try {
    await axios.post(
      `https://graph.instagram.com/v18.0/${params.recipientId}/messages`,
      { message: { text: params.message } },
      { headers: { Authorization: `Bearer ${params.token}` } }
    )
    return { success: true }
  } catch (error) {
    console.error('DM failed:', error)
    return { success: false }
  }
}

export const refreshInstagramToken = async (token: string) => {
  const response = await axios.get(
    `https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=${token}`
  )
  return response.data
}