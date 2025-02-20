// src/actions/integrations/index.ts
'use server'
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { generateTokens } from '@/lib/fetch';
import { onCurrentUser } from '../user';
import { createIntegration, getIntegration } from './queries';
import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient();
export const onIntegrate = async (code: string) => {
  try {
    // Get the authenticated Clerk user.
    const clerkUser = await onCurrentUser();
    if (!clerkUser?.id) throw new Error('User not authenticated');

    // Retrieve the corresponding database user record using prisma.
    const userRecord = await prisma.user.findUnique({
      where: { clerkId: clerkUser.id },
    });
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
    const tokenData = await generateTokens(code);
    if (!tokenData?.access_token) throw new Error('Failed to get access token');

    // Set token expiry to 60 days from now.
    const expireDate = new Date();
    expireDate.setDate(expireDate.getDate() + 60);

    // Create the integration record.
    const integrationResult = await createIntegration({
      userId: userRecord.id,
      token: tokenData.access_token,
      expire: expireDate,
      instagramId: tokenData.instagramId, // Assuming generateTokens returns instagramId
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
      error: error.message || 'Failed to complete Instagram integration',
    };
  }
};