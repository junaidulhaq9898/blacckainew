// src/app/api/payment/route.ts
import { NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { client } from '@/lib/prisma';
import { razorpay } from '@/lib/razorpay';

export async function POST() {
  try {
    // 1. Authenticate user
    const clerkUser = await currentUser();
    if (!clerkUser) {
      return NextResponse.json({ status: 401, message: 'Unauthorized' });
    }

    // 2. Get database user
    const dbUser = await client.user.findUnique({
      where: { clerkId: clerkUser.id },
      select: { id: true, email: true, firstname: true }
    });
    if (!dbUser) {
      return NextResponse.json({ status: 404, message: 'User not found' });
    }

    // 3. Validate environment variables
    const planId = process.env.RAZORPAY_PLAN_ID;
    if (!planId) {
      console.error('RAZORPAY_PLAN_ID missing');
      return NextResponse.json({ status: 500, message: 'Server error' });
    }

    // 4. Create Razorpay subscription
    const subscription = await razorpay.subscriptions.create({
      plan_id: planId,
      total_count: 12,
      customer_notify: 1,
      notes: {
        user_id: dbUser.id // Use snake_case for Razorpay compatibility
      }
    });

    // 5. Update database
    await client.subscription.upsert({
      where: { userId: dbUser.id },
      update: { customerId: subscription.id },
      create: {
        userId: dbUser.id,
        customerId: subscription.id,
        plan: 'FREE'
      }
    });

    // 6. Create payment link (CORRECTED)
    const paymentLink = await razorpay.paymentLink.create({
      subscription_id: subscription.id,
      callback_url: `${process.env.NEXT_PUBLIC_HOST_URL}/payment-success?subscription_id=${subscription.id}&user_id=${dbUser.id}`,
      customer: {
        email: dbUser.email,
        name: dbUser.firstname || 'Customer'
      }
    });

    // 7. Return payment link
    return NextResponse.json({
      status: 200,
      session_url: paymentLink.short_url
    });

  } catch (error: any) {
    console.error('Payment error:', error);
    return NextResponse.json({
      status: error.statusCode || 500,
      message: error.error?.description || 'Payment processing failed'
    });
  }
}