import { NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { client } from '@/lib/prisma';

export async function POST() {
  try {
    // 1. Authentication
    const clerkUser = await currentUser();
    if (!clerkUser) return NextResponse.json({ status: 401, message: 'Unauthorized' });

    // 2. Get database user
    const dbUser = await client.user.findUnique({
      where: { clerkId: clerkUser.id },
      select: { id: true }
    });
    if (!dbUser) return NextResponse.json({ status: 404, message: 'User not found' });

    // 3. Create subscription
    const subResponse = await fetch('https://api.razorpay.com/v1/subscriptions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${Buffer.from(`${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`).toString('base64')}`
      },
      body: JSON.stringify({
        plan_id: process.env.RAZORPAY_PLAN_ID,
        total_count: 12,
        notes: { user_id: dbUser.id }, // Only snake_case
        customer_notify: 1
      })
    });

    const subscription = await subResponse.json();
    if (subscription.error) throw subscription.error;

    // 4. Create payment link (ONLY required fields)
    const plResponse = await fetch('https://api.razorpay.com/v1/payment_links', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${Buffer.from(`${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`).toString('base64')}`
      },
      body: JSON.stringify({
        subscription_id: subscription.id, // snake_case
        callback_url: `${process.env.NEXT_PUBLIC_HOST_URL}/payment-success?subscription_id=${subscription.id}&user_id=${dbUser.id}`
      })
    });

    const paymentLink = await plResponse.json();
    if (paymentLink.error) throw paymentLink.error;

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

    return NextResponse.json({ 
      status: 200,
      session_url: paymentLink.short_url
    });

  } catch (error: any) {
    console.error('Payment error:', error);
    return NextResponse.json({
      status: error.status_code || 500,
      message: error.description || 'Payment failed'
    });
  }
}