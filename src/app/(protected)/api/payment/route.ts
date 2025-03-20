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

    // 3. Validate the Razorpay plan ID.
    const planId = process.env.RAZORPAY_PLAN_ID;
    if (!planId) {
      console.error('RAZORPAY_PLAN_ID missing');
      return NextResponse.json({ status: 500, message: 'Server configuration error' });
    }

    // 4. Create a Razorpay subscription using the plan ID.
    const subscription = await razorpay.subscriptions.create({
      plan_id: planId,
      total_count: 12, // e.g., 12 billing cycles
      customer_notify: 1,
      notes: {
        userId: dbUser.id,
        userEmail: dbUser.email,
      },
    });
    console.log('Subscription created:', subscription.id);

    // 5. Upsert the subscription in your database with an initial plan of 'FREE'
    // (to be updated to 'PRO' via webhook after successful payment).
    await client.subscription.upsert({
      where: { userId: dbUser.id },
      update: { customerId: subscription.id, plan: 'FREE', updatedAt: new Date() },
      create: {
        userId: dbUser.id,
        customerId: subscription.id,
        plan: 'FREE',
      },
    });

    // 6. Fetch the plan details from Razorpay to get the original amount and currency.
    const planDetails = await razorpay.plans.fetch(planId);
    // Assuming the plan details structure includes "item.amount" and "item.currency".
    const amount = planDetails.item.amount;     // e.g., amount in paise
    const currency = planDetails.item.currency;   // e.g., 'INR'

    // 7. Create a payment link using the plan’s original amount and currency,
    // with a callback URL to redirect after payment.
    const paymentLink = await razorpay.paymentLink.create({
      amount, // Use the amount fetched from the plan details.
      currency,
      description: 'Upgrade to PRO Plan',
      customer: {
        email: dbUser.email,
        name: dbUser.firstname || 'User',
      },
      callback_url: `${process.env.NEXT_PUBLIC_HOST_URL}/payment-success?subscription_id=${subscription.id}`,
      callback_method: 'get',
      notes: {
        userId: dbUser.id,
        subscriptionId: subscription.id,
      },
    });
    console.log('Payment link created:', paymentLink.short_url);

    // 8. Return the payment link URL for the client to redirect the user.
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
