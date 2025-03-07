// app/api/webhooks/razorpay/route.ts
import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { updateSubscription } from '@/actions/user/queries';

export async function POST(request: Request) {
  // Get the raw body and signature from the request
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

  // Parse the payload
  const payload = JSON.parse(body);
  console.log('Received webhook event:', payload.event);

  // Variables to hold userId and subscriptionId
  let userId: string | undefined;
  let subscriptionId: string | undefined;

  // Handle different event types
  if (payload.event === 'subscription.charged') {
    const subscription = payload.payload.subscription.entity;
    userId = subscription.notes?.userId;
    subscriptionId = subscription.id;
    if (!subscriptionId) {
      console.error('subscription.id is missing');
      return NextResponse.json({ status: 400, message: 'Missing subscription ID' });
    }
  } else if (payload.event === 'payment_link.paid') {
    const paymentLink = payload.payload.payment_link.entity;
    userId = paymentLink.notes?.userId;
    subscriptionId = paymentLink.subscription_id;
    if (!subscriptionId) {
      console.error('paymentLink.subscription_id is missing');
      return NextResponse.json({ status: 400, message: 'Missing subscription ID' });
    }
  } else {
    console.log('Event not handled:', payload.event);
    return NextResponse.json({ status: 200, message: 'Event not handled' });
  }

  // Ensure userId is present
  if (!userId) {
    console.error('userId not found in notes');
    return NextResponse.json({ status: 400, message: 'Missing userId' });
  }

  // Update the subscription
  try {
    await updateSubscription(userId, { plan: 'PRO', customerId: subscriptionId });
    console.log(`Updated plan to PRO for user ${userId}`);
  } catch (error) {
    console.error('Failed to update subscription:', error);
    return NextResponse.json({ status: 500, message: 'Failed to update plan' });
  }

  return NextResponse.json({ status: 200, message: 'Webhook processed' });
}