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

  // Parse the webhook payload
  const payload = JSON.parse(body);
  console.log('Webhook event:', payload.event);
  console.log('Webhook payload:', JSON.stringify(payload, null, 2));

  let userId: string | undefined;
  let subscriptionId: string | undefined;

  // Handle different webhook events
  if (payload.event === 'subscription.charged' || payload.event === 'subscription.activated') {
    const subscription = payload.payload.subscription.entity;
    userId = subscription.notes?.userId; // Assumes userId is stored in notes
    subscriptionId = subscription.id;
  } else if (payload.event === 'payment_link.paid') {
    const paymentLink = payload.payload.payment_link.entity;
    userId = paymentLink.notes?.userId; // Assumes userId is stored in notes
    subscriptionId = paymentLink.subscription_id;
  }

  // Validate required fields
  if (!userId) {
    console.error('userId not found in notes');
    return NextResponse.json({ status: 400, message: 'Missing userId' });
  }

  if (!subscriptionId) {
    console.error('subscriptionId not found');
    return NextResponse.json({ status: 400, message: 'Missing subscriptionId' });
  }

  // Update the subscription in the database
  try {
    await updateSubscription(userId, { plan: 'PRO', customerId: subscriptionId });
    console.log(`Updated plan to PRO for user ${userId}`);
  } catch (error) {
    console.error('Failed to update subscription:', error);
    return NextResponse.json({ status: 500, message: 'Failed to update plan' });
  }

  // Return success response
  return NextResponse.json({ status: 200, message: 'Webhook processed' });
}