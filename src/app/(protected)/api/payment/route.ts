import { NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { client } from '@/lib/prisma';
import Razorpay from 'razorpay';

interface RazorpaySubscription {
  id: string;
  short_url: string;
}

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

export async function POST(req: Request) {
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

    const planId = process.env.RAZORPAY_PLAN_ID;
    if (!planId) {
      console.error('RAZORPAY_PLAN_ID is missing');
      return NextResponse.json({ status: 500, message: 'Server configuration error' });
    }

    // Create a Razorpay subscription using your plan.
    const subscription = await razorpay.subscriptions.create({
      plan_id: planId,
      total_count: 12, // Number of billing cycles (months)
      customer_notify: 1,
      // Use the exact snake_case keys required by Razorpay.
      notes: { userId: dbUser.id },
    }) as RazorpaySubscription;

    console.log('Subscription created:', subscription.id, 'for user:', dbUser.id);

    // Upsert the subscription in your database.
    // (Store it with plan 'FREE' so that the webhook later updates it to 'PRO' after payment is captured.)
    await client.subscription.upsert({
      where: { userId: dbUser.id },
      update: { customerId: subscription.id, updatedAt: new Date() },
      create: {
        userId: dbUser.id,
        customerId: subscription.id,
        plan: 'FREE'
      },
    });

    const sessionUrl = subscription.short_url;

    return NextResponse.json({
      status: 200,
      session_url: sessionUrl,
    });
  } catch (error: any) {
    console.error('Payment error:', error.message || JSON.stringify(error));
    return NextResponse.json({
      status: 500,
      message: error.message || 'Failed to initiate payment'
    });
  }
}
