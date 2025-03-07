// app/(protected)/api/payment/route.ts
import { razorpay } from '@/lib/razorpay';
import { currentUser } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { findUser } from '@/actions/user/queries'; // Only import findUser

export async function POST(request: Request) {
  // Get the authenticated user from Clerk
  const clerkUser = await currentUser();
  if (!clerkUser) {
    return NextResponse.json({ status: 401, message: 'Unauthorized' });
  }

  // Fetch user from your database
  const user = await findUser(clerkUser.id);
  if (!user) {
    return NextResponse.json({ status: 404, message: 'User not found' });
  }

  const planId = process.env.RAZORPAY_PLAN_ID;
  if (!planId) {
    console.error('RAZORPAY_PLAN_ID is not set');
    return NextResponse.json({ status: 500, message: 'Server configuration error' });
  }

  try {
    // Create the Razorpay subscription
    const subscription = await razorpay.subscriptions.create({
      plan_id: planId,
      customer_notify: 1,
      total_count: 12,
      notes: { userId: user.id },
    });

    // Do NOT update the subscription here; wait for the webhook after payment

    return NextResponse.json({
      status: 200,
      session_url: subscription.short_url, // Return the checkout URL
    });
  } catch (error) {
    console.error('Subscription creation error:', error);
    return NextResponse.json({ status: 500, message: 'Failed to create subscription' });
  }
}