
// src/actions/integrations/index.ts
'use server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { generateTokens } from '@/lib/fetch';
import { onCurrentUser } from '../user';
import { createIntegration, getIntegration } from './queries';

import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient();
export async function onOAuthInstagram(strategy: 'INSTAGRAM' | 'CRM') {
  if (strategy !== 'INSTAGRAM') throw new Error('Invalid integration strategy');
  const oauthUrl = `https://api.instagram.com/oauth/authorize?client_id=${process.env.INSTAGRAM_CLIENT_ID}&redirect_uri=${process.env.NEXT_PUBLIC_HOST_URL}/callback/instagram&scope=instagram_basic,instagram_manage_messages&response_type=code`;
  if (!oauthUrl) throw new Error('Instagram OAuth URL not configured');
  return redirect(oauthUrl);
}

export async function onIntegrate(code: string) {
  try {
    const clerkUser = await onCurrentUser();
    if (!clerkUser?.id) throw new Error('User not authenticated');

    const userRecord = await prisma.user.findUnique({
      where: { clerkId: clerkUser.id },
    });
    if (!userRecord?.id) throw new Error('User record not found');

    const existing = await getIntegration(userRecord.id);
    console.log('getIntegration result:', existing);

    const integrations = existing?.integrations || [];
    console.log('Integrations array:', integrations);

    if (integrations.length > 0) {
      revalidatePath('/integrations');
      return { success: 'Integration exists' };
    }

    const tokenData = await generateTokens(code);
    if (!tokenData?.access_token) throw new Error('Failed to get access token');

    const expireDate = new Date(Date.now() + tokenData.expiresIn * 1000);

    const integrationResult = await createIntegration({
      userId: userRecord.id,
      token: tokenData.access_token,
      expire: expireDate,
      instagramId: tokenData.instagramId,
    });
    if (!integrationResult) throw new Error('Integration record creation failed');

    revalidatePath('/integrations');
    return {
      success: true,
      data: {
        name: [integrationResult.firstname, integrationResult.lastname].filter(Boolean).join(' '),
      },
    };
  } catch (error: any) {
    console.error('Integration failed:', error);
    return {
      error: error.message || 'Failed to complete Instagram integration',
    };
  }
}