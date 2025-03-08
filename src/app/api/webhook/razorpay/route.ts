// app/api/webhooks/razorpay/route.ts
import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { updateSubscription } from '@/actions/user/queries';

export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get('x-razorpay-signature');

  // Verify the webhook signature using Razorpay webhook secret
  const shasum = crypto.createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET!);
  shasum.update(body);
  const digest = shasum.digest('hex');

  if (digest !== signature) {
    console.error('Invalid webhook signature');
    return NextResponse.json({ status: 400, message: 'Invalid signature' });
  }

  const payload = JSON.parse(body);
  console.log('Webhook event:', payload.event);
  console.log('Webhook payload:', JSON.stringify(payload, null, 2));

  let userId: string | undefined;
  let subscriptionId: string | undefined;

  // Handle relevant Razorpay events to extract userId and subscriptionId
  if (payload.event === 'subscription.charged' || payload.event === 'subscription.activated') {
    const subscription = payload.payload.subscription.entity;
    userId = subscription.notes?.userId; // Extract userId from notes
    subscriptionId = subscription.id;
  } else if (payload.event === 'payment_link.paid') {
    const paymentLink = payload.payload.payment_link.entity;
    userId = paymentLink.notes?.userId; // Extract userId from notes
    subscriptionId = paymentLink.subscription_id;
  } else {
    console.log('Unhandled event:', payload.event);
    return NextResponse.json({ status: 200, message: 'Event ignored' });
  }

  // Validate that userId and subscriptionId are present
  if (!userId) {
    console.error('userId not found in webhook payload');
    return NextResponse.json({ status: 400, message: 'Missing userId' });
  }

  if (!subscriptionId) {
    console.error('subscriptionId not found in webhook payload');
    return NextResponse.json({ status: 400, message: 'Missing subscriptionId' });
  }

  try {
    // Update the subscription plan to "PRO" in the database
    await updateSubscription(userId, { plan: 'PRO', customerId: subscriptionId });
    console.log(`Updated plan to PRO for user ${userId}`);
  } catch (error) {
    console.error('Subscription update failed:', error);
    return NextResponse.json({ status: 500, message: 'Failed to update plan' });
  }

  return NextResponse.json({ status: 200, message: 'Webhook processed' });
}