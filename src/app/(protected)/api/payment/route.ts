import { NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { client } from '@/lib/prisma';
import { razorpay } from '@/lib/razorpay';

export async function POST() {
  try {
    // Authentication and user validation
    const clerkUser = await currentUser();
    if (!clerkUser) return NextResponse.json({ status: 401, message: 'Unauthorized' });

    const dbUser = await client.user.findUnique({
      where: { clerkId: clerkUser.id },
      select: { id: true, email: true, firstname: true }
    });
    if (!dbUser) return NextResponse.json({ status: 404, message: 'User not found' });

    // Razorpay configuration validation
    const planId = process.env.RAZORPAY_PLAN_ID;
    if (!planId) {
      console.error('RAZORPAY_PLAN_ID missing');
      return NextResponse.json({ status: 500, message: 'Server configuration error' });
    }

    // Create Razorpay subscription
    const subscription = await razorpay.subscriptions.create({
      plan_id: planId,
      total_count: 12,
      customer_notify: 1,
      notes: {
        user_id: dbUser.id, // Snake_case key for Razorpay compatibility
        user_email: dbUser.email
      }
    });

    // Create payment link with callback
    const paymentLink = await razorpay.paymentLink.create({
      amount: 40000, // ₹400.00 in paise
      currency: 'INR',
      description: 'PRO Plan Subscription',
      subscription_id: subscription.id,
      callback_url: `${process.env.NEXT_PUBLIC_HOST_URL}/payment-success?subscription_id=${subscription.id}&user_id=${dbUser.id}`,
      callback_method: 'get',
      customer: {
        email: dbUser.email,
        name: dbUser.firstname || 'Customer'
      }
    });

    // Store subscription without activating PRO
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
      message: error.error?.description || 'Payment processing failed'
    });
  }
}