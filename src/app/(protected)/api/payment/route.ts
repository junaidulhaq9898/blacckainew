import { NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { client } from '@/lib/prisma';
import { razorpay } from '@/lib/razorpay';
import axios from 'axios';

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
      select: { id: true, email: true, firstname: true }
    });
    if (!dbUser) {
      return NextResponse.json({ status: 404, message: 'User not found' });
    }

    // 3. Validate Razorpay plan ID.
    const planId = process.env.RAZORPAY_PLAN_ID;
    if (!planId) {
      console.error('RAZORPAY_PLAN_ID missing');
      return NextResponse.json({ status: 500, message: 'Server error' });
    }

    // 4. Create a Razorpay subscription using snake_case keys.
    const razorpaySubscription = await razorpay.subscriptions.create({
      plan_id: planId,
      total_count: 12,
      customer_notify: 1,
      notes: { user_id: dbUser.id }
    });
    console.log('Subscription created:', razorpaySubscription.id);

    // 5. Upsert the subscription in your database and mark it as PRO.
    await client.subscription.upsert({
      where: { userId: dbUser.id },
      update: { customerId: razorpaySubscription.id, plan: 'PRO', updatedAt: new Date() },
      create: {
        userId: dbUser.id,
        customerId: razorpaySubscription.id,
        plan: 'PRO'
      }
    });

    // 6. Validate Razorpay credentials.
    const razorpayKeyId = process.env.RAZORPAY_KEY_ID;
    const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!razorpayKeyId || !razorpayKeySecret) {
      console.error('Razorpay credentials are missing');
      return NextResponse.json({ status: 500, message: 'Server error' });
    }

    // 7. Create a payment link using the Razorpay Payment Links API.
    // Note: The correct endpoint is /v1/payment_links.
    const paymentLinkResponse = await axios.post(
      `https://api.razorpay.com/v1/payment_links`,
      {
        currency: 'INR',
        description: 'PRO Plan Subscription',
        subscription_id: razorpaySubscription.id,
        callback_url: `${process.env.NEXT_PUBLIC_HOST_URL}/payment-success`
      },
      {
        auth: {
          username: razorpayKeyId,
          password: razorpayKeySecret,
        },
      }
    );

    const link = paymentLinkResponse.data;
    console.log('Payment link created:', link);

    // Return the payment link URL.
    return NextResponse.json({
      status: 200,
      session_url: link.short_url
    });
  } catch (error) {
    console.error('Payment error:', error);
    return NextResponse.json({
      status: 500,
      message: error instanceof Error ? error.message : 'Payment failed'
    });
  }
}
