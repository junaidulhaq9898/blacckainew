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

    // 2. Retrieve the user from the database.
    // (Ensure your Prisma User model has these fields.)
    const dbUser = await client.user.findUnique({
      where: { clerkId: clerkUser.id },
      select: { id: true, email: true, firstname: true, lastname: true }
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

    // 4. Create a Razorpay subscription.
    // Use the snake_case field names as expected by Razorpay.
    const razorpaySubscription = await razorpay.subscriptions.create({
      plan_id: planId,
      total_count: 12, // e.g. 12 billing cycles
      customer_notify: 1,
      notes: {
        user_id: dbUser.id // Use snake_case as required
      }
    });

    // 5. Upsert the subscription in your database and update the plan to 'PRO'.
    await client.subscription.upsert({
      where: { userId: dbUser.id },
      update: { customerId: razorpaySubscription.id, plan: 'PRO' },
      create: {
        userId: dbUser.id,
        customerId: razorpaySubscription.id,
        plan: 'PRO'
      }
    });

    // 6. Create a payment link.
    // When using subscription, do not pass an "amount" field or extra fields.
    // The Razorpay SDK type definitions may not include 'subscription_id',
    // so we cast the object to any.
    const paymentLink = await razorpay.paymentLink.create({
      currency: 'INR',
      description: 'PRO Plan Subscription',
      subscription_id: razorpaySubscription.id,
      callback_url: `${process.env.NEXT_PUBLIC_HOST_URL}/payment-success`
    } as any) as any;

    // Access the payment link URL using bracket notation
    return NextResponse.json({
      status: 200,
      session_url: paymentLink["short_url"]
    });
  } catch (error) {
    console.error('Payment error:', error);
    return NextResponse.json({
      status: 500,
      message: error instanceof Error ? error.message : 'Payment failed'
    });
  }
}
