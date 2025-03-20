// /api/payment/route.ts
import { NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { client } from '@/lib/prisma';
import { razorpay } from '@/lib/razorpay';

export async function POST() {
  try {
    // 1. Authenticate user via Clerk
    const clerkUser = await currentUser();
    if (!clerkUser) {
      return NextResponse.json({ status: 401, message: 'Unauthorized' });
    }

    // 2. Retrieve user from database
    const dbUser = await client.user.findUnique({
      where: { clerkId: clerkUser.id },
      select: { id: true, email: true, firstname: true },
    });
    if (!dbUser) {
      return NextResponse.json({ status: 404, message: 'User not found' });
    }
    console.log('Database user lookup result:', dbUser);

    // 3. Validate Razorpay plan ID
    const planId = process.env.RAZORPAY_PLAN_ID;
    if (!planId) {
      console.error('RAZORPAY_PLAN_ID missing');
      return NextResponse.json({ status: 500, message: 'Server configuration error' });
    }
    console.log('Using planId:', planId);

    // 4. Create a Razorpay subscription
    console.log('Creating Razorpay subscription...');
    const subscription = await razorpay.subscriptions.create({
      plan_id: planId,
      total_count: 12, // Adjust as needed
      customer_notify: 1,
      notes: {
        userId: dbUser.id,
        userEmail: dbUser.email,
      },
    });
    console.log('Subscription created:', subscription.id);

    // 5. Upsert subscription in database
    await client.subscription.upsert({
      where: { userId: dbUser.id },
      update: { customerId: subscription.id },
      create: {
        userId: dbUser.id,
        customerId: subscription.id,
        plan: 'FREE',
      },
    });

    // 6. Return subscription ID for Checkout.js
    return NextResponse.json({
      status: 200,
      subscriptionId: subscription.id,
      userId: dbUser.id, // For redirect
    });
  } catch (error: any) {
    console.error('Full Payment Error:', {
      message: error.message,
      stack: error.stack,
      rawError: error.response ? JSON.stringify(error.response.data) : error.message,
    });
    return NextResponse.json({
      status: 500,
      message: error.message || 'Failed to initiate payment',
    });
  }
}