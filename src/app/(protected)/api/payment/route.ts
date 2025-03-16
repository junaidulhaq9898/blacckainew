import { NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { client } from '@/lib/prisma';
import { razorpay } from '@/lib/razorpay'; // Your Razorpay instance

export async function POST() {
  try {
    const clerkUser = await currentUser();
    if (!clerkUser) {
      return NextResponse.json({ status: 401, message: 'Unauthorized' });
    }

    const dbUser = await client.user.findUnique({
      where: { clerkId: clerkUser.id },
      select: { id: true, email: true, firstname: true },
    });
    if (!dbUser) {
      return NextResponse.json({ status: 404, message: 'User not found' });
    }

    // Create a Razorpay subscription
    const subscription = await razorpay.subscriptions.create({
      plan_id: process.env.RAZORPAY_PLAN_ID, // Set in .env
      total_count: 12, // e.g., 12 months
      customer_notify: 1,
      notes: { userId: dbUser.id },
    });

    // Store subscription in DB (plan stays FREE until payment)
    await client.subscription.upsert({
      where: { userId: dbUser.id },
      update: { customerId: subscription.id },
      create: {
        userId: dbUser.id,
        customerId: subscription.id,
        plan: 'FREE',
      },
    });

    // Create a payment link with callback
    const paymentLink = await razorpay.paymentLink.create({
      description: 'Upgrade to PRO Plan',
      subscription_id: subscription.id,
      customer: {
        email: dbUser.email,
        name: dbUser.firstname || 'User',
      },
      callback_url: `${process.env.NEXT_PUBLIC_HOST_URL}/payment-success?subscription_id=${subscription.id}`,
      callback_method: 'get',
    });

    return NextResponse.json({
      status: 200,
      session_url: paymentLink.short_url,
    });
  } catch (error) {
    console.error('Payment error:', error);
    return NextResponse.json({ status: 500, message: 'Failed to initiate payment' });
  }
}