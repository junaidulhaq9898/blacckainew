// src/app/api/payment/route.ts
import { NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { client } from '@/lib/prisma';
import { razorpay } from '@/lib/razorpay';

export async function POST() {
  try {
    // Authentication check
    const clerkUser = await currentUser();
    if (!clerkUser) {
      return NextResponse.json({ status: 401, message: 'Unauthorized' });
    }

    // Look up the database user based on Clerk ID
    const dbUser = await client.user.findUnique({
      where: { clerkId: clerkUser.id },
      select: { id: true, email: true, firstname: true }
    });
    if (!dbUser) {
      return NextResponse.json({ status: 404, message: 'User not found' });
    }

    // Validate Razorpay plan id from environment
    const planId = process.env.RAZORPAY_PLAN_ID;
    if (!planId) {
      console.error('RAZORPAY_PLAN_ID missing');
      return NextResponse.json({ status: 500, message: 'Server error' });
    }

    // Create a Razorpay subscription
    const razorpaySubscription = await razorpay.subscriptions.create({
      plan_id: planId,
      total_count: 12,             // e.g. 12 billing cycles
      customer_notify: 1,          // Notify customer via SMS/email
      notes: { 
        user_id: dbUser.id        // Use snake_case key as required by Razorpay
      }
    });

    // Upsert the subscription in your database and mark it as PRO
    await client.subscription.upsert({
      where: { userId: dbUser.id },
      update: { customerId: razorpaySubscription.id, plan: 'PRO' },
      create: {
        userId: dbUser.id,
        customerId: razorpaySubscription.id,
        plan: 'PRO'
      }
    });

    // Create a payment link.
    // IMPORTANT: When using subscription_id, do NOT send the 'amount' field.
    const paymentLink = await razorpay.paymentLink.create({
      currency: 'INR',
      description: 'PRO Plan Subscription',
      subscription_id: razorpaySubscription.id,
      callback_url: `${process.env.NEXT_PUBLIC_HOST_URL}/payment-success`,
      customer: {
        email: dbUser.email,
        name: dbUser.firstname || 'Customer'
      }
    });

    return NextResponse.json({
      status: 200,
      session_url: paymentLink.short_url
    });
  } catch (error) {
    console.error('Payment error:', error);
    return NextResponse.json({
      status: 500,
      message: error instanceof Error ? error.message : 'Payment failed'
    });
  }
}
