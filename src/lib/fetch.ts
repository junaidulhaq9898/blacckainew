import axios from 'axios';

export const refreshToken = async (token: string) => {
  const refresh_token = await axios.get(
    `${process.env.INSTAGRAM_BASE_URL}/refresh_access_token?grant_type=ig_refresh_token&access_token=${token}`
  );
  return refresh_token.data;
};

export const sendDM = async (
  userId: string,
  receiverId: string,
  prompt: string,
  token: string
) => {
  console.log('Sending DM with userId:', userId, 'receiverId:', receiverId);
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
};

export const sendCommentReply = async (
  commentId: string,
  message: string,
  token: string
) => {
  console.log('Sending reply to comment:', commentId);
  try {
    const response = await axios.post(
      `https://graph.instagram.com/v21.0/${commentId}/replies`,
      {
        message: message,
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );
    console.log('Comment reply sent successfully:', response.data);
    return response.data;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error('Error sending comment reply:', errorMessage);
    throw new Error(errorMessage);
  }
};

export const generateTokens = async (code: string) => {
  const insta_form = new FormData();
  insta_form.append('client_id', process.env.INSTAGRAM_CLIENT_ID as string);
  insta_form.append('client_secret', process.env.INSTAGRAM_CLIENT_SECRET as string);
  insta_form.append('grant_type', 'authorization_code');
  insta_form.append('redirect_uri', `${process.env.NEXT_PUBLIC_HOST_URL}/callback/instagram`);
  insta_form.append('code', code);

  const shortTokenRes = await fetch(process.env.INSTAGRAM_TOKEN_URL as string, {
    method: 'POST',
    body: insta_form,
  });

  const token = await shortTokenRes.json();
  const userId = String(token.user_id);

  if (!token.access_token || !userId) {
    throw new Error('Failed to fetch access token or user ID');
  }

  console.log('Generated User ID:', userId, 'Type:', typeof userId);

  const long_token = await axios.get(
    `${process.env.INSTAGRAM_BASE_URL}/access_token?grant_type=ig_exchange_token&client_secret=${process.env.INSTAGRAM_CLIENT_SECRET}&access_token=${token.access_token}`
  );

  return {
    access_token: long_token.data.access_token,
    user_id: userId,
  };
};