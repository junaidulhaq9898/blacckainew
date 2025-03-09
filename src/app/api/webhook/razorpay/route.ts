import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { razorpay } from '@/lib/razorpay'; // Razorpay client setup
import { updateSubscription } from '@/actions/user/queries'; // Subscription update function
import { client } from '@/lib/prisma'; // Prisma client

export async function POST(request: Request) {
  // Get the raw body and signature for verification
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
      // Fetch the subscription from Razorpay
      const subscription = await razorpay.subscriptions.fetch(subscriptionId);
      console.log('Fetched subscription:', subscription);

      // Extract userId from notes and convert it to a string
      const userIdRaw = subscription.notes?.userId;
      const userId = String(userIdRaw); // Ensures userId is always a string for Prisma

      // Validate userId
      if (!userId || userId === 'undefined') {
        console.error('Invalid or missing userId in subscription notes');
        return NextResponse.json({ status: 400, message: 'Invalid userId' });
      }

      // Check for existing subscription
      const existingSubscription = await client.subscription.findUnique({
        where: { userId },
      });
      console.log('Existing subscription:', existingSubscription);

      // Update the subscription to PRO plan
      await updateSubscription(userId, {
        plan: 'PRO',
        customerId: subscriptionId,
      });

      // Verify the update
      const updatedSubscription = await client.subscription.findUnique({
        where: { userId },
      });
      console.log('Updated subscription:', updatedSubscription);

      return NextResponse.json({ status: 200, message: 'Webhook processed' });
    } catch (error) {
      console.error('Error processing webhook:', error);
      return NextResponse.json({ status: 500, message: 'Failed to process webhook' });
    }
  }

  // Ignore other events
  return NextResponse.json({ status: 200, message: 'Event ignored' });
}