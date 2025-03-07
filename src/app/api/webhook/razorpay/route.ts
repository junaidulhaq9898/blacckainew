// app/api/webhooks/razorpay/route.ts
import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { updateSubscription } from '@/actions/user/queries';

export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get('x-razorpay-signature');

  // Verify the webhook signature
  const shasum = crypto.createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET!);
  shasum.update(body);
  const digest = shasum.digest('hex');

  if (digest !== signature) {
    console.error('Invalid webhook signature');
    return NextResponse.json({ status: 400, message: 'Invalid signature' });
  }

  const payload = JSON.parse(body);
  console.log('Webhook payload:', payload); // Log the full payload
  console.log('Webhook event:', payload.event); // Log the event type

  if (payload.event === 'subscription.charged') {
    const subscription = payload.payload.subscription.entity;
    const userId = subscription.notes?.userId; // Safely access userId
    console.log('userId from notes:', userId); // Log the userId

    if (!userId) {
      console.error('userId not found in subscription notes');
      return NextResponse.json({ status: 400, message: 'Missing userId' });
    }

    try {
      await updateSubscription(userId, { plan: 'PRO', customerId: subscription.id });
      console.log(`Updated plan to PRO for user ${userId}`);
    } catch (error) {
      console.error('Failed to update subscription:', error);
      return NextResponse.json({ status: 500, message: 'Failed to update plan' });
    }
  } else {
    console.log('Event not handled:', payload.event); // Log unhandled events
  }

  return NextResponse.json({ status: 200, message: 'Webhook processed' });
}