// /Users/junaid/Desktop/slide-webprodigies/src/app/(protected)/api/payment/route.ts
import { NextResponse } from 'next/server';
import Razorpay from 'razorpay';
import { currentUser } from '@clerk/nextjs/server';
import { client } from '@/lib/prisma'; // Adjust this path if your Prisma client is elsewhere

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

export async function POST() {
  try {
    // Check if user is authenticated
    const clerkUser = await currentUser();
    if (!clerkUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch user from your database
    const dbUser = await client.user.findUnique({
      where: { clerkId: clerkUser.id },
      select: { id: true, email: true },
    });
    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const planId = process.env.RAZORPAY_PLAN_ID;
    if (!planId) {
      return NextResponse.json({ error: 'Plan ID missing' }, { status: 400 });
    }

    // Create Razorpay subscription
    const subscription = await razorpay.subscriptions.create({
      plan_id: planId,
      total_count: 12, // Adjust based on your subscription duration
      customer_notify: 1,
      notes: { userId: dbUser.id },
    });

    // Save subscription to your database
    await client.subscription.upsert({
      where: { userId: dbUser.id },
      update: { customerId: subscription.id },
      create: {
        userId: dbUser.id,
        customerId: subscription.id,
        plan: 'FREE', // Will update to 'PRO' via webhook later
      },
    });

    return NextResponse.json({ subscriptionId: subscription.id });
  } catch (error) {
    console.error('Error creating subscription:', error);
    return NextResponse.json({ error: 'Subscription creation failed' }, { status: 500 });
  }
}