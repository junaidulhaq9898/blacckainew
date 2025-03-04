// src/actions/user/index.ts
'use server';
import { currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { createUser, findUser, updateSubscription } from './queries';
import { refreshToken } from '@/lib/fetch';
import { updateIntegration } from '@/actions/integrations/queries';

export const onCurrentUser = async () => {
  const user = await currentUser();
  if (!user) return redirect('/sign-in');
  return user;
};

export const onBoardUser = async () => {
  const clerkUser = await onCurrentUser();
  try {
    const found = await findUser(clerkUser.id);
    if (found) {
      if (found.integrations && found.integrations.length > 0) {
        const today = new Date();
        const time_left =
          found.integrations[0].expiresAt?.getTime()! - today.getTime();
        const days = Math.round(time_left / (1000 * 3600 * 24));
        if (days < 5) {
          console.log('Refreshing token...');
          const refresh = await refreshToken(found.integrations[0].token);
          const today = new Date();
          const expire_date = today.setDate(today.getDate() + 60);
          const update_token = await updateIntegration(
            refresh.access_token,
            new Date(expire_date),
            found.integrations[0].id
          );
          if (!update_token) {
            console.log('Update token failed');
          }
        }
      }
      return {
        status: 200,
        data: {
          firstname: found.firstname,
          lastname: found.lastname,
          subscription: found.subscription,
          integrations: found.integrations,
        },
      };
    }
    const created = await createUser(
      clerkUser.id,
      clerkUser.firstName!,
      clerkUser.lastName!,
      clerkUser.emailAddresses[0].emailAddress
    );
    return { status: 201, data: created };
  } catch (error) {
    console.log(error);
    return { status: 500 };
  }
};

export const onUserInfo = async () => {
  const clerkUser = await onCurrentUser();
  try {
    const profile = await findUser(clerkUser.id);
    if (profile) return { status: 200, data: profile };
    return { status: 404 };
  } catch (error) {
    return { status: 500 };
  }
};

export const onSubscribe = async (order_id: string, payment_id: string, signature: string) => {
  const clerkUser = await onCurrentUser();
  try {
    const dbUser = await findUser(clerkUser.id);
    if (!dbUser) return { status: 404 };

    // Verify payment signature
    const crypto = require('crypto');
    const expectedSignature = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
      .update(order_id + '|' + payment_id)
      .digest('hex');

    if (expectedSignature === signature) {
      const subscribed = await updateSubscription(dbUser.id, {
        customerId: payment_id,
        plan: 'PRO',
      });

      if (subscribed) return { status: 200 };
      return { status: 401 };
    } else {
      return { status: 400, error: 'Invalid signature' };
    }
  } catch (error) {
    return { status: 500 };
  }
};
