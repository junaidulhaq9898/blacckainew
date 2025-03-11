import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { client } from '@/lib/prisma'; // Your Prisma client
import { razorpay } from '@/lib/razorpay'; // Your Razorpay instance

export async function POST(request: Request) {
  try {
    // Step 1: Get the webhook body and signature
    const body = await request.text();
    const signature = request.headers.get('x-razorpay-signature');

    if (!signature) {
      console.error('Missing signature in webhook request');
      return NextResponse.json({ status: 400, message: 'Missing signature' });
    }

    // Step 2: Verify the webhook signature
    const shasum = crypto.createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET!);
    shasum.update(body);
    const digest = shasum.digest('hex');

    if (digest !== signature) {
      console.error('Invalid webhook signature');
      return NextResponse.json({ status: 400, message: 'Invalid signature' });
    }

    // Step 3: Parse the webhook payload
    const payload = JSON.parse(body);
    console.log('Webhook event received:', payload.event);

    // Step 4: Handle the payment.captured event
    if (payload.event === 'payment.captured') {
      const payment = payload.payload.payment.entity;
      const subscriptionId = payment.subscription_id;

      if (!subscriptionId) {
        console.error('No subscription_id found in payment');
        return NextResponse.json({ status: 400, message: 'Missing subscription_id' });
      }

      // Step 5: Fetch subscription details from Razorpay
      const subscription = await razorpay.subscriptions.fetch(subscriptionId);
      const userId = subscription.notes?.userId;

      if (!userId || typeof userId !== 'string') {
        console.error('Invalid or missing userId in subscription notes:', subscription.notes);
        return NextResponse.json({ status: 400, message: 'Invalid userId' });
      }

      console.log('Processing subscription update for user:', userId);

      // Step 6: Fetch the current subscription from the database
      const currentSubscription = await client.subscription.findUnique({
        where: { userId: userId },
      });

      if (!currentSubscription) {
        console.error('Subscription not found for user:', userId);
        return NextResponse.json({ status: 404, message: 'Subscription not found' });
      }

      console.log('Current subscription plan:', currentSubscription.plan);

      // Step 7: Update the subscription to PRO
      const updatedSubscription = await client.subscription.update({
        where: { userId: userId },
        data: {
          plan: 'PRO',
          customerId: subscriptionId, // Store Razorpay subscription ID
          updatedAt: new Date(),
        },
      });

      console.log('Subscription updated:', updatedSubscription);

      // Step 8: Verify the update
      const verifiedSubscription = await client.subscription.findUnique({
        where: { userId: userId },
      });

      if (verifiedSubscription?.plan !== 'PRO') {
        console.error('Failed to update plan to PRO');
        return NextResponse.json({ status: 500, message: 'Plan update failed' });
      }

      console.log('Plan successfully updated to PRO');
      return NextResponse.json({ status: 200, message: 'Plan updated to PRO' });
    }

    // For other events, acknowledge receipt
    return NextResponse.json({ status: 200, message: 'Event received' });
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error('Error processing webhook:', error.message, error.stack);
    } else {
      console.error('Error processing webhook:', String(error));
    }
    return NextResponse.json({ status: 500, message: 'Failed to process webhook' });
  }
}