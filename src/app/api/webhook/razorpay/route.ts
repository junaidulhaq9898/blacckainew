// app/api/webhook/razorpay/route.ts
import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { razorpay } from '@/lib/razorpay'; // Your Razorpay client
import { client } from '@/lib/prisma'; // Your Prisma client

export async function POST(request: Request) {
  // Get raw body and signature
  const body = await request.text();
  const signature = request.headers.get('x-razorpay-signature');

  // Verify webhook signature
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET!;
  const shasum = crypto.createHmac('sha256', secret);
  shasum.update(body);
  const digest = shasum.digest('hex');

  if (digest !== signature) {
    console.error('Invalid webhook signature');
    return NextResponse.json({ status: 400, message: 'Invalid signature' });
  }

  // Parse payload
  const payload = JSON.parse(body);
  if (payload.event !== 'payment.captured') {
    return NextResponse.json({ status: 200, message: 'Event ignored' });
  }

  const payment = payload.payload.payment.entity;
  const subscriptionId = payment.subscription_id;

  if (!subscriptionId) {
    console.error('No subscription_id found');
    return NextResponse.json({ status: 400, message: 'Missing subscription_id' });
  }

  try {
    // Fetch subscription details from Razorpay
    const subscription = await razorpay.subscriptions.fetch(subscriptionId);
    const userId = subscription.notes?.userId;

    if (!userId || typeof userId !== 'string') {
      console.error('Invalid userId in subscription notes:', subscription.notes);
      return NextResponse.json({ status: 400, message: 'Invalid userId' });
    }

    // Check if user exists
    const user = await client.user.findUnique({ where: { id: userId } });
    if (!user) {
      console.error(`User not found: ${userId}`);
      return NextResponse.json({ status: 404, message: 'User not found' });
    }

    // Update subscription
    await client.subscription.upsert({
      where: { userId },
      create: {
        userId,
        customerId: subscriptionId,
        plan: 'PRO',
      },
      update: {
        customerId: subscriptionId,
        plan: 'PRO',
      },
    });

    // Verify the update
    const updatedSubscription = await client.subscription.findUnique({
      where: { userId },
    });
    if (updatedSubscription?.plan !== 'PRO') {
      console.error('Subscription update failed');
      return NextResponse.json({ status: 500, message: 'Failed to update plan' });
    }

    console.log(`Subscription updated for user ${userId} to PRO`);
    return NextResponse.json({ status: 200, message: 'Webhook processed successfully' });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ status: 500, message: 'Webhook processing failed' });
  }
}