// app/api/webhook/route.ts
import { NextResponse } from 'next/server';
import * as crypto from 'crypto';
import { client } from '@/lib/prisma'; // Your Prisma client
import { razorpay } from '@/lib/razorpay'; // Razorpay SDK instance

export async function POST(request: Request) {
  try {
    // Step 1: Extract and verify the webhook signature
    const body = await request.text();
    const signature = request.headers.get('x-razorpay-signature');

    if (!signature) {
      console.error('Missing signature in webhook request');
      return NextResponse.json({ status: 400, message: 'Missing signature' });
    }

    const shasum = crypto.createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET!);
    shasum.update(body);
    const digest = shasum.digest('hex');

    if (digest !== signature) {
      console.error('Invalid webhook signature');
      return NextResponse.json({ status: 400, message: 'Invalid signature' });
    }

    // Step 2: Parse the webhook payload
    const payload = JSON.parse(body);
    console.log('Webhook event received:', payload.event);

    // Step 3: Handle the payment.captured event
    if (payload.event === 'payment.captured') {
      const payment = payload.payload.payment.entity;
      const subscriptionId = payment.subscription_id;

      if (!subscriptionId) {
        console.error('No subscription_id found in payment');
        return NextResponse.json({ status: 400, message: 'Missing subscription_id' });
      }

      // Step 4: Fetch subscription details from Razorpay
      const subscription = await razorpay.subscriptions.fetch(subscriptionId);
      const userId = subscription.notes?.userId;

      if (!userId || typeof userId !== 'string') {
        console.error('Invalid or missing userId in subscription notes:', subscription.notes);
        return NextResponse.json({ status: 400, message: 'Invalid userId' });
      }
      console.log('Processing subscription update for user:', userId);

      // Step 5: Verify user exists
      const user = await client.user.findUnique({
        where: { id: userId },
        include: { subscription: true },
      });

      if (!user) {
        console.error('User not found in database:', userId);
        return NextResponse.json({ status: 404, message: 'User not found' });
      }

      // Step 6: Check for existing subscription
      if (!user.subscription) {
        console.error('Subscription not found for user:', userId);
        return NextResponse.json({ status: 500, message: 'Subscription missing' });
      }

      // Step 7: Update the subscription to PRO
      const updated = await client.subscription.update({
        where: { userId: userId }, // Unique identifier
        data: {
          plan: 'PRO',
          customerId: subscriptionId,
          updatedAt: new Date(),
        },
      });
      console.log('Subscription updated:', updated);

      // Step 8: Verify the update
      const verifiedSubscription = await client.subscription.findUnique({
        where: { userId: userId },
      });

      if (verifiedSubscription && verifiedSubscription.plan === 'PRO') {
        console.log('Plan successfully updated to PRO');
      } else {
        console.error('Failed to update plan to PRO');
      }

      return NextResponse.json({ status: 200, message: 'Plan updated to PRO' });
    }

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