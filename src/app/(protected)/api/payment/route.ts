import { NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { client } from '@/lib/prisma';
import { razorpay } from '@/lib/razorpay';

export async function POST() {
  try {
    // 1. Authenticate user via Clerk.
    const clerkUser = await currentUser();
    if (!clerkUser) {
      return NextResponse.json({ status: 401, message: 'Unauthorized' });
    }

    // 2. Retrieve user from database.
    const dbUser = await client.user.findUnique({
      where: { clerkId: clerkUser.id },
      select: { id: true, email: true, firstname: true },
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

    // 4. Create a Razorpay subscription using the plan ID.
    // This ensures the original plan amount and settings are used.
    const subscription = await razorpay.subscriptions.create({
      plan_id: planId,
      total_count: 12, // e.g., 12 billing cycles
      customer_notify: 1,
      notes: {
        userId: dbUser.id,
        userEmail: dbUser.email,
      },
    });
    console.log('Subscription created:', subscription.id, 'for user:', dbUser.id);

    // 5. Upsert the subscription in your database.
    // Immediately set the plan to 'PRO' as in your old code.
    await client.subscription.upsert({
      where: { userId: dbUser.id },
      update: { customerId: subscription.id, plan: 'PRO', updatedAt: new Date() },
      create: {
        userId: dbUser.id,
        customerId: subscription.id,
        plan: 'PRO',
      },
    });

    // 6. Return the Razorpay-hosted subscription short_url for payment.
    // This uses your original plan details (amount, currency, etc.)
    return NextResponse.json({
      status: 200,
      session_url: subscription.short_url,
    });
  } catch (error: any) {
    console.error('Payment error:', error.message);
    return NextResponse.json({
      status: 500,
      message: error.message || 'Failed to initiate payment',
    });
  }
}
