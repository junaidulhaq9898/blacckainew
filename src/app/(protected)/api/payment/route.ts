import { NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { client } from '@/lib/prisma';
import { razorpay } from '@/lib/razorpay';
import axios from 'axios';

export async function POST() {
  try {
    // 1. Get the current user from Clerk
    const clerkUser = await currentUser();
    if (!clerkUser) {
      return NextResponse.json({ status: 401, message: 'Unauthorized' });
    }

    // 2. Fetch the corresponding user from the database
    const dbUser = await client.user.findUnique({
      where: { clerkId: clerkUser.id },
      select: { id: true, email: true, firstname: true, subscription: true }
    });

    if (!dbUser) {
      return NextResponse.json({ status: 404, message: 'User not found' });
    }

    // 3. Validate Razorpay plan ID
    const planId = process.env.RAZORPAY_PLAN_ID;
    if (!planId) {
      console.error('RAZORPAY_PLAN_ID missing');
      return NextResponse.json({ status: 500, message: 'Server error' });
    }

    // 4. Create a Razorpay Subscription
    const razorpaySubscription = await razorpay.subscriptions.create({
      plan_id: planId,
      total_count: 12,
      customer_notify: 1,
      notes: { user_id: dbUser.id }
    });

    console.log('Subscription created:', razorpaySubscription.id);

    // 5. Upsert the Subscription in the Database
    await client.subscription.upsert({
      where: { userId: dbUser.id },
      update: {
        customerId: razorpaySubscription.id,
        plan: 'PRO',
        updatedAt: new Date(),
      },
      create: {
        userId: dbUser.id,
        customerId: razorpaySubscription.id,
        plan: 'PRO',
      }
    });

    // 6. Create a Payment Link for the Subscription
    const paymentLinkResponse = await axios.post(
      `https://api.razorpay.com/v1/subscriptions/${razorpaySubscription.id}/links`,
      {
        currency: 'INR',
        description: 'PRO Plan Subscription',
        subscription_id: razorpaySubscription.id,
        callback_url: `${process.env.NEXT_PUBLIC_HOST_URL}/payment-success`,
      },
      {
        auth: {
          username: process.env.RAZORPAY_KEY_ID!,
          password: process.env.RAZORPAY_KEY_SECRET!,
        },
      }
    );

    const link = paymentLinkResponse.data;
    return NextResponse.json({ status: 200, session_url: link.short_url });
  } catch (error) {
    console.error('Payment error:', error);
    return NextResponse.json({
      status: 500,
      message: error instanceof Error ? error.message : 'Payment failed',
    });
  }
}
