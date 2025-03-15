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
    // (Your Prisma User model contains id, email, and firstname.)
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
      return NextResponse.json({ status: 500, message: 'Server configuration error' });
    }

    // 4. Create a Razorpay subscription.
    // Use snake_case keys as required by Razorpay.
    const subscription = await razorpay.subscriptions.create({
      plan_id: planId,
      total_count: 12, // e.g., 12 billing cycles (months)
      customer_notify: 1,
      notes: { 
        userId: dbUser.id,        // exactly "userId"
        userEmail: dbUser.email
      }
    });
    console.log('Subscription created:', subscription.id, 'for user:', dbUser.id);

    // 5. Upsert the subscription in your database and mark the plan as PRO.
    await client.subscription.upsert({
      where: { userId: dbUser.id },
      update: { customerId: subscription.id, plan: 'PRO', updatedAt: new Date() },
      create: {
        userId: dbUser.id,
        customerId: subscription.id,
        plan: 'PRO'
      }
    });

    // 6. Create a payment link for the subscription.
    // IMPORTANT: In subscription mode, DO NOT include extra fields like amount, currency, or customer.
    const paymentLinkResponse = await axios.post(
      'https://api.razorpay.com/v1/payment_links',
      {
        description: 'Upgrade to PRO Plan',
        subscription_id: subscription.id,
        callback_url: `${process.env.NEXT_PUBLIC_HOST_URL}/payment-success?subscription_id=${subscription.id}`
      },
      {
        auth: {
          username: process.env.RAZORPAY_KEY_ID!,
          password: process.env.RAZORPAY_KEY_SECRET!,
        },
      }
    );
    const link = paymentLinkResponse.data;
    console.log('Payment link created:', link.short_url);

    return NextResponse.json({
      status: 200,
      session_url: link.short_url,
    });
  } catch (error: any) {
    console.error('Payment error:', error.message);
    return NextResponse.json({
      status: 500,
      message: error.message || 'Failed to initiate payment'
    });
  }
}
