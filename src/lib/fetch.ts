// src/lib/fetch.ts
import axios from 'axios';

/**
 * Refreshes an Instagram long-lived access token.
 */
export const refreshToken = async (token: string) => {
  try {
    const response = await axios.get(
      `${process.env.INSTAGRAM_BASE_URL}/refresh_access_token`,
      {
        params: {
          grant_type: 'ig_refresh_token',
          access_token: token,
        },
      }
    );
    return response.data;
  } catch (error) {
    console.error('Error refreshing token:', error);
    throw error;
  }
};

/**
 * Sends a direct message using the Instagram Graph API.
 */
export const sendDM = async (
  userId: string, // Instagram Business Account ID
  receiverId: string,
  prompt: string,
  token: string
) => {
  console.log('Sending message');
  try {
    const response = await axios.post(
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
    );
    return response.data;
  } catch (error) {
    console.error('Error sending DM:', error);
    throw error;
  }
};

/**
 * Generates tokens and fetches the Instagram Business Account ID.
 */
export const generateTokens = async (code: string) => {
  try {
    // Validate environment variables
    const requiredVars = [
      'INSTAGRAM_CLIENT_ID',
      'INSTAGRAM_CLIENT_SECRET',
      'INSTAGRAM_BASE_URL',
      'NEXT_PUBLIC_HOST_URL',
    ];
    for (const varName of requiredVars) {
      if (!process.env[varName]) {
        throw new Error(`${varName} is not defined in environment variables.`);
      }
    }

    // Step 1: Get short-lived access token
    const instaForm = new FormData();
    instaForm.append('client_id', process.env.INSTAGRAM_CLIENT_ID!);
    instaForm.append('client_secret', process.env.INSTAGRAM_CLIENT_SECRET!);
    instaForm.append('grant_type', 'authorization_code');
    instaForm.append('redirect_uri', `${process.env.NEXT_PUBLIC_HOST_URL}/callback/instagram`);
    instaForm.append('code', code);

    console.log('Fetching short-lived token with params:', {
      client_id: process.env.INSTAGRAM_CLIENT_ID,
      redirect_uri: `${process.env.NEXT_PUBLIC_HOST_URL}/callback/instagram`,
      code,
    });

    const shortTokenRes = await fetch('https://graph.instagram.com/oauth/access_token', {
      method: 'POST',
      body: instaForm,
    });

    if (!shortTokenRes.ok) {
      const errorText = await shortTokenRes.text();
      console.error('Short-lived token fetch failed:', shortTokenRes.status, errorText);
      throw new Error(`Failed to fetch short-lived token: ${shortTokenRes.status} - ${errorText}`);
    }

    const shortTokenData = await shortTokenRes.json();
    const shortAccessToken = shortTokenData.access_token;
    const basicUserId = String(shortTokenData.user_id); // Ensure string type

    console.log('Short-lived token response:', shortTokenData);

    // Step 2: Exchange for a long-lived token
    const longTokenRes = await axios.get(
      `${process.env.INSTAGRAM_BASE_URL}/access_token`,
      {
        params: {
          grant_type: 'ig_exchange_token',
          client_secret: process.env.INSTAGRAM_CLIENT_SECRET,
          access_token: shortAccessToken,
        },
      }
    );

    const longAccessToken = longTokenRes.data.access_token;
    const expiresIn = longTokenRes.data.expires_in;

    console.log('Long-lived token response:', longTokenRes.data);

    // Step 3: Fetch Instagram Business Account ID and username
    const igUserRes = await axios.get(
      `${process.env.INSTAGRAM_BASE_URL}/me`,
      {
        params: {
          fields: 'id,username,account_type,instagram_business_account',
          access_token: longAccessToken,
        },
      }
    );

    const igData = igUserRes.data;
    console.log('Instagram account data:', igData);

    if (!igData.instagram_business_account || !igData.instagram_business_account.id) {
      throw new Error(
        'No Instagram Business Account found. Ensure the account is a Business or Creator account linked to a Facebook Page.'
      );
    }

    return {
      access_token: longAccessToken,
      instagramId: igData.instagram_business_account.id, // Correct ID for DMs
      expiresIn: expiresIn, // Seconds until expiration
      username: igData.username,
    };
  } catch (error) {
    console.error('Error in generateTokens:', error);
    throw error;
  }
};

export default {
  refreshToken,
  sendDM,
  generateTokens,
};