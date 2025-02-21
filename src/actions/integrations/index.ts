// src/actions/integrations/index.ts
'use server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import axios from 'axios';
import { generateTokens } from '@/lib/fetch';
import { onCurrentUser } from '@/actions/user';
import { findUser, upsertUser } from '@/actions/user/queries';
import { createIntegration, getIntegration } from './queries';
import { User } from '@prisma/client'; // Import User type for consistency

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
    console.log('Clerk User:', clerkUser);

    // Define userRecord type explicitly to match findUser's return type
    let userRecord = await findUser(clerkUser.id);
    if (!userRecord) {
      console.log('User not found, upserting with Clerk ID:', clerkUser.id);
      const email = clerkUser.emailAddresses[0]?.emailAddress;
      if (!email) throw new Error('No email found in Clerk user data');
      
      // Upsert and fetch full user record
      const upsertedUser = await upsertUser(
        clerkUser.id,
        clerkUser.firstName || '',
        clerkUser.lastName || '',
        email
      );
      userRecord = await findUser(clerkUser.id); // Re-fetch full user after upsert
      if (!userRecord?.id) throw new Error('Failed to upsert user record');
    }
    console.log('User Record:', userRecord);

    const existing = await getIntegration(userRecord.id);
    console.log('Existing integrations:', existing?.integrations);

    const integrations = (existing && Array.isArray(existing.integrations))
      ? existing.integrations
      : [];
    if (integrations.length > 0) {
      revalidatePath('/integrations');
      return { success: 'Integration exists' };
    }

    const tokenData = await generateTokens(code);
    if (!tokenData?.access_token || !tokenData?.user_id) {
      throw new Error('Failed to get access token or user ID');
    }

    const { data } = await axios.get<{ id: string; username: string }>(
      `${process.env.INSTAGRAM_BASE_URL}/me`,
      {
        params: { fields: 'id,username', access_token: tokenData.access_token },
      }
    );
    if (!data || !data.id) throw new Error('Failed to retrieve Instagram user ID');

    const instagramId = String(data.id); // Ensure ID is a string
    console.log('Fetched Instagram ID:', instagramId, 'Username:', data.username);

    const expireDate = new Date();
    expireDate.setDate(expireDate.getDate() + 60);

    const integrationResult = await createIntegration({
      userId: userRecord.id,
      token: tokenData.access_token,
      expire: expireDate,
      instagramId: instagramId,
    });
    if (!integrationResult) throw new Error('Integration record creation failed');

    revalidatePath('/integrations');
    return {
      success: true,
      data: {
        name:
          integrationResult.firstname || integrationResult.lastname
            ? [integrationResult.firstname, integrationResult.lastname]
                .filter(Boolean)
                .join(' ')
            : clerkUser.firstName && clerkUser.lastName
            ? `${clerkUser.firstName} ${clerkUser.lastName}`
            : clerkUser.firstName || clerkUser.lastName || 'User',
      },
    };
  } catch (error: any) {
    console.error('Integration failed:', error.message);
    return {
      error: error.message || 'Failed to complete Instagram integration',
    };
  }
};