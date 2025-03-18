// src/app/api/payment/route.ts
import { NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { client } from '@/lib/prisma';
import { razorpay } from '@/lib/razorpay';

export async function POST() {
  try {
    // 1. Authenticate the user via Clerk.
    const clerkUser = await currentUser();
    if (!clerkUser) {
      return NextResponse.json({ status: 401, message: 'Unauthorized' });
    }

    // 2. Retrieve the user from your database.
    const dbUser = await client.user.findUnique({
      where: { clerkId: clerkUser.id },
      select: { id: true, email: true, firstname: true },
    });
    if (!dbUser) {
      return NextResponse.json({ status: 404, message: 'User not found' });
    }

    // 3. Validate Razorpay plan ID.
    const planId = process.env.RAZORPAY_PLAN_ID;
    if (!planId) {
      console.error('RAZORPAY_PLAN_ID missing');
      return NextResponse.json({ status: 500, message: 'Server configuration error' });
    }

    // 4. Create a Razorpay subscription using your plan.
    const subscription = await razorpay.subscriptions.create({
      plan_id: planId,
      total_count: 12, // e.g., 12 billing cycles (months)
      customer_notify: 1,
      // Use snake_case keys exactly.
      notes: { userId: dbUser.id, userEmail: dbUser.email },
    });
    console.log('Subscription created:', subscription.id, 'for user:', dbUser.id);

    // 5. Upsert the subscription in your database.
    // (We store it initially with plan "FREE"; the webhook will update it to "PRO" after payment.)
    await client.subscription.upsert({
      where: { userId: dbUser.id },
      update: { customerId: subscription.id },
      create: {
        userId: dbUser.id,
        customerId: subscription.id,
        plan: 'FREE',
      },
    });

    // 6. Create a payment link using only the subscription_id.
    // IMPORTANT: When using subscription_id, do NOT include fields like amount, currency, callback_method, or notes.
    const paymentLink = await razorpay.paymentLink.create({
      subscription_id: subscription.id,
      callback_url: `${process.env.NEXT_PUBLIC_HOST_URL}/payment-success?subscription_id=${subscription.id}`,
    });
    console.log('Payment link created:', paymentLink.short_url);

    return NextResponse.json({
      status: 200,
      session_url: paymentLink.short_url,
    });
  } catch (error: any) {
    console.error('Payment error:', error.message || JSON.stringify(error));
    return NextResponse.json({
      status: 500,
      message: error.message || 'Failed to initiate payment',
    });
  }
}
