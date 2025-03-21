import { NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { client } from '@/lib/prisma';
import { razorpay } from '@/lib/razorpay';

export async function POST() {
  try {
    // 1. Authenticate user via Clerk.
    const clerkUser = await currentUser();
    if (!clerkUser) {
      return NextResponse.json({ status: 401, message: 'Unauthorized' });
    }

    // 2. Retrieve user from your database.
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

    // 4. Create a Razorpay subscription using the plan ID.
    // This ensures the original plan details (amount, currency, etc.) are used.
    const subscription = await razorpay.subscriptions.create({
      plan_id: planId,
      total_count: 12, // e.g., 12 billing cycles
      customer_notify: 1,
      notes: {
        userId: dbUser.id,
        userEmail: dbUser.email,
      },
    });
    console.log('Subscription created:', subscription.id, 'for user:', dbUser.id);

    // 5. Upsert subscription in your database.
    // We start with plan 'FREE' so that the webhook (or further logic) can update it if needed.
    await client.subscription.upsert({
      where: { userId: dbUser.id },
      update: { customerId: subscription.id },
      create: {
        userId: dbUser.id,
        customerId: subscription.id,
        plan: 'FREE', // Will be updated to 'PRO' after successful payment
      },
    });

    // 6. Fetch the plan details to obtain the original amount and currency.
    const planDetails = await razorpay.plans.fetch(planId);
    const amount = planDetails.item.amount;     // amount in paise
    const currency = planDetails.item.currency;   // e.g., 'INR'

    // 7. Create a payment link using the plan’s original amount & currency.
    // The callback URL passes the user's id (as 'user_id') so that the success page can redirect properly.
    const paymentLink = await razorpay.paymentLink.create({
      amount, // uses the amount from the plan details
      currency,
      description: 'Upgrade to PRO Plan',
      customer: {
        email: dbUser.email,
        name: dbUser.firstname || 'User',
      },
      callback_url: `${process.env.NEXT_PUBLIC_HOST_URL}/payment-success?user_id=${dbUser.id}`,
      callback_method: 'get',
      notes: {
        userId: dbUser.id,
        subscriptionId: subscription.id,
      },
    });
    console.log('Payment link created:', paymentLink.short_url);

    // 8. Return the payment link URL for redirection.
    return NextResponse.json({
      status: 200,
      session_url: paymentLink.short_url,
    });
  } catch (error: any) {
    console.error('Payment error:', error.message);
    return NextResponse.json({
      status: 500,
      message: error.message || 'Failed to initiate payment',
    });
  }
}
