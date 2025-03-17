import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { client } from '@/lib/prisma';
import Razorpay from 'razorpay';

// Define the Razorpay Subscription response type
interface RazorpaySubscription {
  id: string;
  short_url: string;
}

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

export async function POST(req: NextRequest) {
  try {
    // Step 1: Authenticate the user
    const clerkUser = await currentUser();
    if (!clerkUser) {
      return NextResponse.json({ status: 401, message: 'Unauthorized' });
    }

    // Step 2: Retrieve user details from the database
    const dbUser = await client.user.findUnique({
      where: { clerkId: clerkUser.id },
      select: { id: true, email: true, firstname: true },
    });
    if (!dbUser) {
      return NextResponse.json({ status: 404, message: 'User not found' });
    }

    // Step 3: Create a subscription with the plan ID
    const planId = process.env.RAZORPAY_PLAN_ID;
    if (!planId) {
      console.error('RAZORPAY_PLAN_ID is missing');
      return NextResponse.json({ status: 500, message: 'Server configuration error' });
    }

    const subscription = await razorpay.subscriptions.create({
      plan_id: planId, // Amount is defined by the plan
      total_count: 12, // Number of billing cycles
      customer_notify: 1, // Notify the customer
      notes: { userId: dbUser.id },
    }) as RazorpaySubscription;

    // Step 4: Store subscription details in the database
    await client.subscription.upsert({
      where: { userId: dbUser.id },
      update: { customerId: subscription.id },
      create: {
        userId: dbUser.id,
        customerId: subscription.id,
        plan: 'FREE', // Plan remains FREE until payment is confirmed
      },
    });

    // Step 5: Return the subscription URL
    const sessionUrl = subscription.short_url;

    return NextResponse.json({
      status: 200,
      session_url: sessionUrl,
    });
  } catch (error: any) {
    console.error('Payment error:', error);
    return NextResponse.json({
      status: 500,
      message: error.message || 'Failed to initiate payment',
    });
  }
}