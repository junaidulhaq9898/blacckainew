// /api/webhooks/razorpay/route.ts
import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { client } from '@/lib/prisma'; // Your Prisma client
import { razorpay } from '@/lib/razorpay'; // Your Razorpay instance

export async function POST(request: Request) {
  try {
    // Step 1: Get and verify the webhook signature
    const body = await request.text();
    const signature = request.headers.get('x-razorpay-signature');

    if (!signature) {
      console.error('No signature provided');
      return NextResponse.json({ status: 400, message: 'Missing signature' });
    }

    const shasum = crypto.createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET!);
    shasum.update(body);
    const digest = shasum.digest('hex');

    if (digest !== signature) {
      console.error('Invalid signature');
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
        console.error('No subscription ID in payment:', payment);
        return NextResponse.json({ status: 400, message: 'Missing subscription_id' });
      }

      // Step 4: Fetch subscription details from Razorpay
      const subscription = await razorpay.subscriptions.fetch(subscriptionId);
      const userId = subscription.notes?.userId;

      if (!userId || typeof userId !== 'string') {
        console.error('Invalid or missing userId in subscription notes:', subscription.notes);
        return NextResponse.json({ status: 400, message: 'Invalid userId' });
      }

      console.log('Found userId:', userId);

      // Step 5: Update the subscription in the database
      const updatedSubscription = await client.subscription.update({
        where: { userId: userId },
        data: { 
          plan: 'PRO',
          customerId: subscriptionId,
          updatedAt: new Date()
        },
      });

      console.log('Subscription updated successfully:', updatedSubscription);
      return NextResponse.json({ status: 200, message: 'Plan updated to PRO' });
    }

    // Ignore other events
    return NextResponse.json({ status: 200, message: 'Event received but not processed' });
  } catch (error) {
    console.error('Webhook processing failed:', error);
    return NextResponse.json({ status: 500, message: 'Failed to process webhook' });
  }
}