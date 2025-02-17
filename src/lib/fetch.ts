'use server'

const INSTAGRAM_BASE_URL = process.env.INSTAGRAM_BASE_URL;
const APP_SECRET = process.env.INSTAGRAM_APP_SECRET;
const APP_ID = process.env.INSTAGRAM_APP_ID;

interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

interface InstagramError {
  error: {
    message: string;
    type: string;
    code: number;
    fbtrace_id: string;
  }
}

// Generate tokens from auth code
export const generateTokens = async (code: string): Promise<TokenResponse> => {
  try {
    const response = await fetch(
      `${INSTAGRAM_BASE_URL}/oauth/access_token`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: APP_ID!,
          client_secret: APP_SECRET!,
          grant_type: 'authorization_code',
          code,
          redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/integrations`,
        }),
      }
    );

    if (!response.ok) {
      const error = await response.json() as InstagramError;
      throw new Error(error.error.message);
    }

    const data = await response.json();
    return data;
  } catch (error: any) {
    console.error('Token generation error:', error);
    throw new Error(error.message || 'Failed to generate token');
  }
};

// Refresh an existing token
export const refreshToken = async (token: string): Promise<TokenResponse> => {
  try {
    const response = await fetch(
      `${INSTAGRAM_BASE_URL}/refresh_access_token`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'fb_exchange_token',
          client_id: APP_ID!,
          client_secret: APP_SECRET!,
          fb_exchange_token: token,
        }),
      }
    );

    if (!response.ok) {
      const error = await response.json() as InstagramError;
      throw new Error(error.error.message);
    }

    const data = await response.json();
    return data;
  } catch (error: any) {
    console.error('Token refresh error:', error);
    throw new Error(error.message || 'Failed to refresh token');
  }
};

// Send Direct Message
export const sendDM = async (
  recipientId: string,
  senderId: string,
  message: string,
  token: string
) => {
  try {
    const response = await fetch(
      `${INSTAGRAM_BASE_URL}/${recipientId}/messages`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          recipient: { id: senderId },
          message: { text: message },
        }),
      }
    );

    if (!response.ok) {
      const error = await response.json() as InstagramError;
      throw new Error(error.error.message);
    }

    return {
      status: response.status,
      data: await response.json(),
    };
  } catch (error: any) {
    console.error('Send DM error:', error);
    throw new Error(error.message || 'Failed to send message');
  }
};

// Get Instagram Media
export const getMedia = async (token: string) => {
  try {
    const response = await fetch(
      `${INSTAGRAM_BASE_URL}/me/media?fields=id,caption,media_url,media_type,timestamp&limit=25`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      const error = await response.json() as InstagramError;
      throw new Error(error.error.message);
    }

    return await response.json();
  } catch (error: any) {
    console.error('Get media error:', error);
    throw new Error(error.message || 'Failed to fetch media');
  }
};

// Reply to a comment
export const replyToComment = async (
  commentId: string,
  message: string,
  token: string
) => {
  try {
    const response = await fetch(
      `${INSTAGRAM_BASE_URL}/${commentId}/replies`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          message,
        }),
      }
    );

    if (!response.ok) {
      const error = await response.json() as InstagramError;
      throw new Error(error.error.message);
    }

    return {
      status: response.status,
      data: await response.json(),
    };
  } catch (error: any) {
    console.error('Reply to comment error:', error);
    throw new Error(error.message || 'Failed to reply to comment');
  }
};

// Validate Instagram token
export const validateToken = async (token: string): Promise<boolean> => {
  try {
    const response = await fetch(
      `${INSTAGRAM_BASE_URL}/me?access_token=${token}`
    );
    return response.status === 200;
  } catch (error) {
    console.error('Token validation error:', error);
    return false;
  }
};

// Get account insights
export const getInsights = async (token: string) => {
  try {
    const response = await fetch(
      `${INSTAGRAM_BASE_URL}/me/insights?metric=impressions,reach,profile_views&period=day`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      const error = await response.json() as InstagramError;
      throw new Error(error.error.message);
    }

    return await response.json();
  } catch (error: any) {
    console.error('Get insights error:', error);
    throw new Error(error.message || 'Failed to fetch insights');
  }
};