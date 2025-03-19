import { NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { client } from '@/lib/prisma';
import { razorpay } from '@/lib/razorpay';

export async function POST() {
  try {
    const clerkUser = await currentUser();
    if (!clerkUser) return NextResponse.json({ status: 401, message: 'Unauthorized' });

    const dbUser = await client.user.findUnique({
      where: { clerkId: clerkUser.id },
      select: { id: true }
    });
    if (!dbUser) return NextResponse.json({ status: 404, message: 'User not found' });

    const planId = process.env.RAZORPAY_PLAN_ID;
    if (!planId) return NextResponse.json({ status: 500, message: 'Server error' });

    // 1. Create subscription with snake_case notes
    const subscription = await razorpay.subscriptions.create({
      plan_id: planId,
      total_count: 12,
      customer_notify: 1,
      notes: { user_id: dbUser.id } // Only snake_case
    });

    // 2. Create minimal payment link
    const paymentLink = await razorpay.paymentLink.create({
      subscription_id: subscription.id,
      callback_url: `${process.env.NEXT_PUBLIC_HOST_URL}/payment-success?subscription_id=${subscription.id}&user_id=${dbUser.id}`
    });

    // 3. Update database
    await client.subscription.upsert({
      where: { userId: dbUser.id },
      update: { customerId: subscription.id },
      create: {
        userId: dbUser.id,
        customerId: subscription.id,
        plan: 'FREE'
      }
    });

    return NextResponse.json({ 
      status: 200,
      session_url: paymentLink.short_url
    });

  } catch (error: any) {
    console.error('Payment error:', error);
    return NextResponse.json({
      status: error.statusCode || 500,
      message: error.error?.description || 'Payment failed'
    });
  }
}