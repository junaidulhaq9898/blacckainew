'use server'
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import axios from 'axios';
import { generateTokens } from '@/lib/fetch';
import { onCurrentUser } from '../user';
import { findUser } from '../user/queries';
import { createIntegration, getIntegration } from './queries';

const INSTAGRAM_TOKEN_EXPIRY_DAYS = 60;

const validateInstagramToken = async (token: string) => {
  try {
    const response = await axios.get(
      `${process.env.INSTAGRAM_BASE_URL}/me`,
      { params: { access_token: token } }
    );
    return response.status === 200;
  } catch (error) {
    console.error('Token validation error:', error);
    return false;
  }
};

export const onOAuthInstagram = (strategy: 'INSTAGRAM' | 'CRM') => {
  if (strategy !== 'INSTAGRAM') throw new Error('Invalid integration strategy');
  const oauthUrl = process.env.INSTAGRAM_EMBEDDED_OAUTH_URL;
  if (!oauthUrl) throw new Error('Instagram OAuth URL not configured');
  return redirect(oauthUrl);
};

export const onIntegrate = async (code: string) => {
  try {
    const clerkUser = await onCurrentUser();
    if (!clerkUser?.id) throw new Error('User not authenticated');

    const userRecord = await findUser(clerkUser.id);
    if (!userRecord?.id) throw new Error('User record not found');

    const existing = await getIntegration(userRecord.id);
    const integrations = existing?.integrations || [];

    // Check if there's a valid existing integration
    const instagramIntegration = integrations.find(i => 
      i.name === 'INSTAGRAM' && 
      i.expiresAt && 
      new Date(i.expiresAt) > new Date()
    );

    if (instagramIntegration) {
      return { success: true, message: 'Valid integration exists' };
    }

    // Get new token
    const token = await generateTokens(code);
    if (!token?.access_token) {
      throw new Error('Failed to get access token');
    }

    // Validate token
    const isValid = await validateInstagramToken(token.access_token);
    if (!isValid) {
      throw new Error('Invalid Instagram token received');
    }

    // Get Instagram user ID
    const { data } = await axios.get(
      `${process.env.INSTAGRAM_BASE_URL}/me`,
      { params: { fields: 'id', access_token: token.access_token } }
    );

    if (!data?.id) {
      throw new Error('Failed to retrieve Instagram user id');
    }

    // Set expiration
    const expireDate = new Date();
    expireDate.setDate(expireDate.getDate() + INSTAGRAM_TOKEN_EXPIRY_DAYS);

    // Create integration
    const integrationResult = await createIntegration({
      userId: userRecord.id,
      token: token.access_token,
      expire: expireDate,
      instagramId: data.id,
    });

    if (!integrationResult) {
      throw new Error('Integration creation failed');
    }

    revalidatePath('/integrations');
    return { 
      success: true,
      data: {
        name: [integrationResult.firstname, integrationResult.lastname]
          .filter(Boolean)
          .join(' '),
      },
    };
  } catch (error: any) {
    console.error('Integration failed:', error);
    return {
      success: false,
      error: error.message || 'Integration failed'
    };
  }
};