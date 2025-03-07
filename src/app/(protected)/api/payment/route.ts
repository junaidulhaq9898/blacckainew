// app/(protected)/api/payment/route.ts
import { razorpay } from '@/lib/razorpay';
import { currentUser } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { findUser } from '@/actions/user/queries'; // Ensure this retrieves the database user

export async function POST(request: Request) {
  const clerkUser = await currentUser();
  if (!clerkUser) {
    return NextResponse.json({ status: 401, message: 'Unauthorized' });
  }

  // Fetch the database user using Clerk's user ID
  const dbUser = await findUser(clerkUser.id);
  if (!dbUser) {
    return NextResponse.json({ status: 404, message: 'User not found' });
  }

  const planId = process.env.RAZORPAY_PLAN_ID;
  if (!planId) {
    console.error('RAZORPAY_PLAN_ID is not set');
    return NextResponse.json({ status: 500, message: 'Server configuration error' });
  }

  try {
    const subscription = await razorpay.subscriptions.create({
      plan_id: planId,
      customer_notify: 1,
      total_count: 12,
      notes: { userId: dbUser.id }, // Use database user ID (UUID)
    });

    const paymentLink = await razorpay.paymentLink.create({
      amount: 50000, // Adjust to your plan amount in paise
      currency: 'INR',
      description: 'Upgrade to PRO Plan',
      customer: { email: dbUser.email },
      callback_url: `https://blacckai.com/payment-success?subscription_id=${subscription.id}`,
      callback_method: 'get',
    });

    return NextResponse.json({
      status: 200,
      session_url: paymentLink.short_url,
    });
  } catch (error) {
    console.error('Payment link creation error:', error);
    return NextResponse.json({ status: 500, message: 'Failed to initiate payment' });
  }
}