// src/lib/fetch.ts
import axios, { AxiosError } from 'axios';

// Type definitions
export interface DmResponse {
  status: number;
  data?: {
    recipient_id: string;
    message_id: string;
  };
  error?: {
    message: string;
    code?: number;
    type?: string;
  };
}

interface InstagramUserInfo {
  id: string; // This will be the 178-prefixed app-scoped ID
  username: string;
}

interface LongLivedToken {
  access_token: string;
  expires_in: number;
}

// Helper function for Instagram API requests
const makeInstagramRequest = async <T>(config: {
  url: string;
  method: 'GET' | 'POST';
  token: string;
  data?: any;
}): Promise<T> => {
  try {
    const response = await axios({
      url: config.url,
      method: config.method,
      headers: {
        Authorization: `Bearer ${config.token}`,
        'Content-Type': 'application/json',
      },
      data: config.data,
    });
    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError;
    throw {
      status: axiosError.response?.status || 500,
      error: {
        message: (axiosError.response?.data as any)?.error?.message || 'Unknown error',
        code: (axiosError.response?.data as any)?.error?.code,
        type: (axiosError.response?.data as any)?.error?.type,
      }
    };
  }
};

export const refreshToken = async (token: string): Promise<LongLivedToken> => {
  return makeInstagramRequest<LongLivedToken>({
    url: `${process.env.INSTAGRAM_BASE_URL}/refresh_access_token?grant_type=ig_refresh_token`,
    method: 'GET',
    token,
  });
};

export const sendDM = async (
  appScopedUserId: string, // Should be 178-prefixed ID
  receiverPageScopedId: string, // 89-prefixed ID for recipient
  prompt: string,
  token: string
): Promise<DmResponse> => {
  try {
    const response = await makeInstagramRequest<{
      recipient_id: string;
      message_id: string;
    }>({
      url: `${process.env.INSTAGRAM_BASE_URL}/v18.0/${appScopedUserId}/messages`,
      method: 'POST',
      token,
      data: {
        recipient: { id: receiverPageScopedId },
        messaging_type: "RESPONSE",
        message: { text: prompt },
      },
    });

    return {
      status: 200,
      data: response
    };
  } catch (error: any) {
    return {
      status: error.status || 500,
      error: {
        message: error.error?.message || 'Failed to send DM',
        code: error.error?.code,
        type: error.error?.type
      }
    };
  }
};

export const generateTokens = async (code: string): Promise<{
  access_token: string;
  expires_in: number;
  user_id: string; // 178-prefixed app-scoped ID
  username: string;
}> => {
  try {
    // Step 1: Get short-lived token
    const form = new FormData();
    form.append('client_id', process.env.INSTAGRAM_CLIENT_ID!);
    form.append('client_secret', process.env.INSTAGRAM_CLIENT_SECRET!);
    form.append('grant_type', 'authorization_code');
    form.append('redirect_uri', `${process.env.NEXT_PUBLIC_HOST_URL}/callback/instagram`);
    form.append('code', code);

    // Get initial access token
    const tokenResponse = await axios.post(process.env.INSTAGRAM_TOKEN_URL!, form);
    
    if (!tokenResponse.data.access_token) {
      throw new Error('Failed to get access token');
    }

    // Step 2: Get app-scoped user ID (178-prefixed)
    const userInfo = await makeInstagramRequest<InstagramUserInfo>({
      url: `${process.env.INSTAGRAM_BASE_URL}/me?fields=id,username`,
      method: 'GET',
      token: tokenResponse.data.access_token,
    });

    // Step 3: Exchange for long-lived token
    const longToken = await makeInstagramRequest<LongLivedToken>({
      url: `${process.env.INSTAGRAM_BASE_URL}/access_token?grant_type=ig_exchange_token&client_secret=${process.env.INSTAGRAM_CLIENT_SECRET}`,
      method: 'GET',
      token: tokenResponse.data.access_token,
    });

    return {
      ...longToken,
      user_id: userInfo.id, // This is the correct 178-prefixed ID
      username: userInfo.username,
    };

  } catch (error) {
    console.error('Token generation failed:', error);
    throw error;
  }
};

// Additional utility functions
export const getUserProfile = async (userId: string, token: string): Promise<{
  id: string;
  username: string;
  account_type: string;
  media_count: number;
}> => {
  return makeInstagramRequest({
    url: `${process.env.INSTAGRAM_BASE_URL}/${userId}?fields=id,username,account_type,media_count`,
    method: 'GET',
    token,
  });
};

export const validateWebhookToken = async (token: string): Promise<boolean> => {
  try {
    await makeInstagramRequest({
      url: `${process.env.INSTAGRAM_BASE_URL}/me`,
      method: 'GET',
      token,
    });
    return true;
  } catch {
    return false;
  }
};