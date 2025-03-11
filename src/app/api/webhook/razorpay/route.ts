import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { client } from '@/lib/prisma'; // Your Prisma client
import { razorpay } from '@/lib/razorpay'; // Your Razorpay instance

export async function POST(request: Request) {
  try {
    // Step 1: Get webhook body and signature
    const body = await request.text();
    const signature = request.headers.get('x-razorpay-signature');

    if (!signature) {
      console.error('Missing signature in webhook request');
      return NextResponse.json({ status: 400, message: 'Missing signature' });
    }

    // Step 2: Verify webhook signature
    const shasum = crypto.createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET!);
    shasum.update(body);
    const digest = shasum.digest('hex');

    if (digest !== signature) {
      console.error('Invalid webhook signature');
      return NextResponse.json({ status: 400, message: 'Invalid signature' });
    }

    // Step 3: Parse webhook payload
    const payload = JSON.parse(body);
    console.log('Webhook event:', payload.event);

    // Step 4: Handle payment.captured event
    if (payload.event === 'payment.captured') {
      const payment = payload.payload.payment.entity;
      const subscriptionId = payment.subscription_id;

      if (!subscriptionId) {
        console.error('No subscription_id in payment:', payment);
        return NextResponse.json({ status: 400, message: 'Missing subscription_id' });
      }

      // Step 5: Fetch subscription from Razorpay
      const subscription = await razorpay.subscriptions.fetch(subscriptionId);
      const userId = subscription.notes?.userId;

      if (!userId || typeof userId !== 'string') {
        console.error('Invalid or missing userId in notes:', subscription.notes);
        return NextResponse.json({ status: 400, message: 'Invalid userId' });
      }

      console.log('Updating subscription for user:', userId);

      // Step 6: Update subscription in database
      const updatedSubscription = await client.subscription.update({
        where: { userId: userId },
        data: {
          plan: 'PRO',
          customerId: subscriptionId, // Store Razorpay subscription ID
          updatedAt: new Date(),
        },
      });

      console.log('Subscription updated:', updatedSubscription);
      return NextResponse.json({ status: 200, message: 'Plan updated to PRO' });
    }

    return NextResponse.json({ status: 200, message: 'Event received' });
  } catch (error: unknown) {
    console.error('Webhook error:', error instanceof Error ? error.message : String(error));
    return NextResponse.json({ status: 500, message: 'Failed to process webhook' });
  }
}