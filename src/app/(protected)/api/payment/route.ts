// /Users/junaid/Desktop/slide-webprodigies/src/app/(protected)/api/payment/route.ts
import { NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { client } from '@/lib/prisma'; // Adjust this import based on your Prisma setup
import { razorpay } from '@/lib/razorpay'; // Adjust this import based on your Razorpay setup

export async function POST() {
  try {
    // Authenticate the user with Clerk
    const clerkUser = await currentUser();
    if (!clerkUser) {
      return NextResponse.json({ status: 401, message: 'Unauthorized' });
    }

    // Fetch the user from the database
    const dbUser = await client.user.findUnique({
      where: { clerkId: clerkUser.id },
      select: { id: true, email: true, firstname: true },
    });
    if (!dbUser) {
      return NextResponse.json({ status: 404, message: 'User not found' });
    }

    // Ensure Razorpay plan ID is available
    const planId = process.env.RAZORPAY_PLAN_ID;
    if (!planId) {
      console.error('RAZORPAY_PLAN_ID is not set');
      return NextResponse.json({ status: 500, message: 'Server configuration error' });
    }

    // Create a Razorpay subscription
    const subscription = await razorpay.subscriptions.create({
      plan_id: planId,
      total_count: 12, // Example: 12 billing cycles
      customer_notify: 1,
      notes: {
        userId: dbUser.id,
        userEmail: dbUser.email,
      },
    });
    console.log('Subscription created:', subscription.id, 'for user:', dbUser.id);

    // Store the subscription in the database with an initial "FREE" plan
    await client.subscription.upsert({
      where: { userId: dbUser.id },
      update: { customerId: subscription.id },
      create: {
        userId: dbUser.id,
        customerId: subscription.id,
        plan: 'FREE', // Will be updated to "PRO" via webhook
      },
    });

    // Return the subscription ID to the client
    return NextResponse.json({
      status: 200,
      subscriptionId: subscription.id,
    });
  } catch (error: any) {
    console.error('Payment error:', error.message);
    return NextResponse.json({
      status: 500,
      message: error.message || 'Failed to initiate payment',
    });
  }
}