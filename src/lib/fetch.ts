import axios from 'axios';

// Helper for Instagram API requests
const makeInstagramRequest = async <T>(config: {
  url: string
  method: 'GET' | 'POST'
  token: string
  data?: any
}) => {
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

    if (response.data.error) {
      throw new Error(response.data.error.message);
    }

    return response.data as T;
  } catch (error: any) {
    console.error('Instagram API error:', error.response?.data || error.message);
    throw error;
  }
};

export const refreshToken = async (token: string) => {
  return makeInstagramRequest<{ access_token: string; expires_in: number }>({
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
) => {
  return makeInstagramRequest({
    url: `${process.env.INSTAGRAM_BASE_URL}/v18.0/${appScopedUserId}/messages`,
    method: 'POST',
    token,
    data: {
      recipient: { id: receiverPageScopedId },
      messaging_type: "RESPONSE",
      message: { text: prompt },
    },
  });
};

export const generateTokens = async (code: string) => {
  try {
    // Step 1: Get short-lived token
    const form = new FormData();
    form.append('client_id', process.env.INSTAGRAM_CLIENT_ID!);
    form.append('client_secret', process.env.INSTAGRAM_CLIENT_SECRET!);
    form.append('grant_type', 'authorization_code');
    form.append('redirect_uri', `${process.env.NEXT_PUBLIC_HOST_URL}/callback/instagram`);
    form.append('code', code);

    const tokenResponse = await axios.post(
      process.env.INSTAGRAM_TOKEN_URL!,
      form
    );

    const { access_token, user_id } = tokenResponse.data;

    if (!access_token) {
      throw new Error('Failed to get access token');
    }

    // Step 2: Get app-scoped user ID (178-prefixed)
    const userInfo = await makeInstagramRequest<{
      id: string
      username: string
    }>({
      url: `${process.env.INSTAGRAM_BASE_URL}/me?fields=id,username`,
      method: 'GET',
      token: access_token,
    });

    // Step 3: Exchange for long-lived token
    const longToken = await makeInstagramRequest<{
      access_token: string
      expires_in: number
    }>({
      url: `${process.env.INSTAGRAM_BASE_URL}/access_token?grant_type=ig_exchange_token&client_secret=${process.env.INSTAGRAM_CLIENT_SECRET}`,
      method: 'GET',
      token: access_token,
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

// Additional helper for comment replies
export const sendCommentReply = async (
  appScopedUserId: string,
  commentId: string,
  message: string,
  token: string
) => {
  return makeInstagramRequest({
    url: `${process.env.INSTAGRAM_BASE_URL}/v18.0/${appScopedUserId}/comments`,
    method: 'POST',
    token,
    data: {
      message,
      comment_id: commentId,
    },
  });
};