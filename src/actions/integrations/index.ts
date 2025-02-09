// /src/actions/integrations/index.ts
'use server'
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import axios from 'axios';
import { generateTokens } from '@/lib/fetch';
import { onCurrentUser } from '../user';
import { findUser } from '../user/queries';
import { createIntegration, getIntegration } from './queries';

export const onOAuthInstagram = (strategy: 'INSTAGRAM' | 'CRM') => {
  if (strategy !== 'INSTAGRAM') throw new Error('Invalid integration strategy');

  const oauthUrl = process.env.INSTAGRAM_EMBEDDED_OAUTH_URL;
  if (!oauthUrl) throw new Error('Instagram OAuth URL not configured');

  return redirect(oauthUrl);
};

export const onIntegrate = async (code: string) => {
  try {
    // Get the authenticated Clerk user.
    const clerkUser = await onCurrentUser();
    if (!clerkUser?.id) throw new Error('User not authenticated');

    // Retrieve the corresponding database user record.
    const userRecord = await findUser(clerkUser.id);
    if (!userRecord?.id) throw new Error('User record not found');

    // Retrieve existing integrations.
    const existing = await getIntegration(userRecord.id);
    console.log('getIntegration result:', existing);

    // Defensive check: default integrations to an empty array.
    const integrations = (existing && Array.isArray(existing.integrations))
      ? existing.integrations
      : [];
    console.log('Integrations array:', integrations);

    if (integrations.length > 0) {
      revalidatePath('/integrations');
      return { success: 'Integration exists' };
    }

    // Exchange the provided code for tokens.
    const token = await generateTokens(code);
    if (!token?.access_token) throw new Error('Failed to get access token');

    // Retrieve the Instagram user ID using the access token.
    const { data } = await axios.get<{ id: string }>(
      `${process.env.INSTAGRAM_BASE_URL}/me`,
      { params: { fields: 'id', access_token: token.access_token } }
    );
    if (!data?.id) {
      throw new Error('Failed to retrieve Instagram user id');
    }

    // Set token expiry to 60 days from now.
    const expireDate = new Date();
    expireDate.setDate(expireDate.getDate() + 60);

    // Create the integration record.
    const integrationResult = await createIntegration({
      userId: userRecord.id,
      token: token.access_token,
      expire: expireDate,
      instagramId: data.id,
    });
    if (!integrationResult) {
      throw new Error('Integration record creation failed');
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
      error: error.response?.data?.message ||
             error.message ||
             'Failed to complete Instagram integration',
    };
  }
};
