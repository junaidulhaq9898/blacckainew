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

    // Get database user
    const dbUser = await client.user.findUnique({
      where: { clerkId: clerkUser.id },
      select: { id: true, email: true, firstname: true }
    });

    if (!dbUser) {
      return NextResponse.json({ status: 404, message: 'User not found' });
    }

    // Validate environment config
    const planId = process.env.RAZORPAY_PLAN_ID;
    if (!planId) {
      console.error('RAZORPAY_PLAN_ID missing');
      return NextResponse.json({ status: 500, message: 'Server error' });
    }

    // Create Razorpay subscription with valid parameters
    const razorpaySubscription = await razorpay.subscriptions.create({
      plan_id: planId,
      total_count: 12, // Valid parameter
      customer_notify: 1, // Valid parameter
      notes: { // Valid notes format
        user_id: dbUser.id // Razorpay requires snake_case keys
      }
    });

    // Store subscription in database
    await client.subscription.upsert({
      where: { userId: dbUser.id },
      update: { customerId: razorpaySubscription.id },
      create: {
        userId: dbUser.id,
        customerId: razorpaySubscription.id,
        plan: 'FREE'
      }
    });

    // Create payment link with valid parameters
    const paymentLink = await razorpay.paymentLink.create({
      amount: 50000, // Required
      currency: 'INR', // Required
      description: 'PRO Plan Subscription',
      subscription_id: razorpaySubscription.id, // Valid parameter
      callback_url: `${process.env.NEXT_PUBLIC_HOST_URL}/payment-success`,
      customer: { // Valid customer object
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