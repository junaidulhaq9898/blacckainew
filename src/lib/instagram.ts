// lib/instagram.ts
import axios, { AxiosError } from 'axios'

export const sendDM = async (
  pageId: string,
  recipientId: string,
  message: string,
  token: string
) => {
  try {
    const response = await axios.post(
      `https://graph.instagram.com/v21.0/${pageId}/messages`,
      {
        recipient: { id: recipientId },
        message: { text: message }
      },
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    )
    return response
  } catch (error) {
    if (error instanceof AxiosError) {
      console.error('DM Error:', error.response?.data || error.message)
    } else {
      console.error('DM Error:', error)
    }
    throw error
  }
}

export const setupWebhook = async (instagramId: string, token: string) => {
  try {
    // First, check existing subscriptions
    const checkResponse = await axios.get(
      `https://graph.facebook.com/v21.0/${instagramId}/subscribed_apps`,
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    )
    
    // If not subscribed, create subscription
    if (!checkResponse.data.data?.length) {
      const response = await axios.post(
        `https://graph.facebook.com/v21.0/${instagramId}/subscribed_apps`,
        {
          subscribed_fields: ['messages', 'message_reactions', 'message_reads']
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      )
      return response.data
    }
    
    return checkResponse.data
  } catch (error) {
    if (error instanceof AxiosError) {
      console.error('Webhook setup error:', error.response?.data || error.message)
    } else {
      console.error('Webhook setup error:', error)
    }
    throw error
  }
}

export const verifyBusinessAccount = async (token: string) => {
  try {
    const response = await axios.get(
      'https://graph.facebook.com/v21.0/me?fields=id,instagram_business_account',
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    )
    
    if (!response.data.instagram_business_account?.id) {
      throw new Error('Not a business account')
    }
    
    return {
      userId: response.data.id,
      businessId: response.data.instagram_business_account.id
    }
  } catch (error) {
    if (error instanceof AxiosError) {
      console.error('Business account verification failed:', error.response?.data || error.message)
    } else {
      console.error('Business account verification failed:', error)
    }
    throw error
  }
}

export const refreshInstagramToken = async (token: string) => {
  try {
    const response = await axios.get(
      `https://graph.instagram.com/refresh_access_token`,
      {
        params: {
          grant_type: 'ig_refresh_token',
          access_token: token
        }
      }
    )
    return response.data
  } catch (error) {
    if (error instanceof AxiosError) {
      console.error('Token refresh failed:', error.response?.data || error.message)
    } else {
      console.error('Token refresh failed:', error)
    }
    throw error
  }
}