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
      select: { id: true, email: true }
    });

    if (!dbUser) {
      return NextResponse.json({ status: 404, message: 'User not found' });
    }

    // Validate environment config
    const planId = process.env.RAZORPAY_PLAN_ID;
    if (!planId) {
      return NextResponse.json({ status: 500, message: 'Server error' });
    }

    // Create Razorpay subscription (only documented parameters)
    const subscription = await razorpay.subscriptions.create({
      plan_id: planId,
      total_count: 12,
      customer_notify: 1
    });

    // Store subscription in database
    await client.subscription.upsert({
      where: { userId: dbUser.id },
      update: { customerId: subscription.id },
      create: {
        userId: dbUser.id,
        customerId: subscription.id,
        plan: 'FREE'
      }
    });

    // Create payment link (only documented parameters)
    const paymentLink = await razorpay.paymentLink.create({
      amount: 50000,
      currency: 'INR',
      description: 'PRO Plan',
      subscription_id: subscription.id,
      callback_url: `${process.env.NEXT_PUBLIC_HOST_URL}/payment-success`,
      customer: {
        email: dbUser.email,
        name: "Customer"
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
      message: 'Payment initialization failed'
    });
  }
}