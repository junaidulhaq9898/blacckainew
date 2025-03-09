import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { razorpay } from '@/lib/razorpay'; // Razorpay client setup
import { updateSubscription } from '@/actions/user/queries'; // Subscription update function
import { client } from '@/lib/prisma'; // Prisma client

export async function POST(request: Request) {
  // Get raw body and signature for verification
  const body = await request.text();
  const signature = request.headers.get('x-razorpay-signature');

  // Verify webhook signature
  const shasum = crypto.createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET!);
  shasum.update(body);
  const digest = shasum.digest('hex');

  if (digest !== signature) {
    console.error('Invalid webhook signature');
    return NextResponse.json({ status: 400, message: 'Invalid signature' });
  }

  // Parse webhook payload
  const payload = JSON.parse(body);
  console.log('Received webhook event:', payload.event);

  // Handle payment.captured event
  if (payload.event === 'payment.captured') {
    const payment = payload.payload.payment.entity;
    const subscriptionId = payment.subscription_id;

    if (!subscriptionId) {
      console.error('No subscription_id in payment.captured event');
      return NextResponse.json({ status: 400, message: 'Missing subscription_id' });
    }

    try {
      // Fetch subscription details from Razorpay
      const subscription = await razorpay.subscriptions.fetch(subscriptionId);
      console.log('Fetched subscription:', subscription);

      // Extract userId from subscription notes (adjust based on your setup)
      const userId = String(subscription.notes?.userId || '');

      if (!userId) {
        console.error('Missing userId in subscription notes');
        return NextResponse.json({ status: 400, message: 'Invalid userId' });
      }

      // Update the user's subscription
      await updateSubscription(userId, {
        plan: 'PRO',
        customerId: subscriptionId,
      });

      return NextResponse.json({ status: 200, message: 'Webhook processed' });
    } catch (error) {
      console.error('Error processing webhook:', error);
      return NextResponse.json({ status: 500, message: 'Failed to process webhook' });
    }
  }

  // Ignore other events
  return NextResponse.json({ status: 200, message: 'Event ignored' });
}