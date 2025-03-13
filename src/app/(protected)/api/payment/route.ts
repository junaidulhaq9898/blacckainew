import { NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { client } from '@/lib/prisma';
import { razorpay } from '@/lib/razorpay';
import axios from 'axios';

export async function POST() {
  try {
    // 1. Authenticate the user using Clerk.
    const clerkUser = await currentUser();
    if (!clerkUser) {
      return NextResponse.json({ status: 401, message: 'Unauthorized' });
    }

    // 2. Retrieve the user from the database.
    const dbUser = await client.user.findUnique({
      where: { clerkId: clerkUser.id },
      select: { id: true, email: true }
    });
    if (!dbUser) {
      return NextResponse.json({ status: 404, message: 'User not found' });
    }

    // 3. Validate the Razorpay plan ID.
    const planId = process.env.RAZORPAY_PLAN_ID;
    if (!planId) {
      console.error('RAZORPAY_PLAN_ID missing');
      return NextResponse.json({ status: 500, message: 'Server error' });
    }

    // 4. Create a Razorpay subscription.
    // Use snake_case keys as expected by Razorpay.
    const razorpaySubscription = await razorpay.subscriptions.create({
      plan_id: planId,
      total_count: 12,
      customer_notify: 1,
      notes: { user_id: dbUser.id }
    });

    // 5. Upsert the subscription in the database.
    // Remove the 'status' field since it does not exist in your schema.
    await client.subscription.upsert({
      where: { userId: dbUser.id },
      update: { customerId: razorpaySubscription.id },
      create: {
        userId: dbUser.id,
        customerId: razorpaySubscription.id,
        plan: 'FREE'  // Adjust this value if needed (e.g. 'PRO' if that’s desired)
      }
    });

    // 6. Validate Razorpay credentials.
    const razorpayKeyId = process.env.RAZORPAY_KEY_ID;
    const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!razorpayKeyId || !razorpayKeySecret) {
      console.error('Razorpay credentials are missing');
      return NextResponse.json({ status: 500, message: 'Server error' });
    }

    // 7. Create a payment link.
    // When using a subscription, do not pass extra fields like "amount" or "customer".
    // The Razorpay Node SDK type definitions may not include 'subscription_id', so we use a cast.
    const response = await axios.post(
      `https://api.razorpay.com/v1/subscriptions/${razorpaySubscription.id}/links`,
      {
        description: 'PRO Plan Subscription',
        customer_notify: 1,
        callback_url: `${process.env.NEXT_PUBLIC_HOST_URL}/payment-success`
      },
      {
        auth: {
          username: razorpayKeyId,
          password: razorpayKeySecret,
        },
      }
    );

    const link = response.data;

    // Access the payment link URL using the property "short_url"
    return NextResponse.json({
      status: 200,
      session_url: link.short_url,
    });
  } catch (error) {
    console.error('Payment error:', error);
    return NextResponse.json({
      status: 500,
      message: error instanceof Error ? error.message : 'Payment failed',
    });
  }
}
