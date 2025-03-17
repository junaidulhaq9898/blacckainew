import { NextRequest, NextResponse } from 'next/server';
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

export async function POST(req: NextRequest) {
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

    const subscription = await razorpay.subscriptions.create({
      plan_id: planId,
      total_count: 12, // Number of billing cycles
      customer_notify: 1, // Notify customer via email/SMS
      notes: { userId: dbUser.id },
    }) as RazorpaySubscription;

    // Store or update subscription details in your database
    await client.subscription.upsert({
      where: { userId: dbUser.id },
      update: { customerId: subscription.id },
      create: {
        userId: dbUser.id,
        customerId: subscription.id,
        plan: 'FREE', // Initial plan, update to 'PRO' via webhook on payment
      },
    });

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