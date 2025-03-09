import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { razorpay } from '@/lib/razorpay'; // Your Razorpay instance
import { client } from '@/lib/prisma';     // Your Prisma client

export async function POST(request: Request) {
  // Get the webhook body and signature
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
  console.log('Webhook event received:', payload.event);

  // Handle the payment.captured event
  if (payload.event === 'payment.captured') {
    const payment = payload.payload.payment.entity;
    const subscriptionId = payment.subscription_id;

    if (!subscriptionId) {
      console.error('No subscription_id found in payment');
      return NextResponse.json({ status: 400, message: 'Missing subscription_id' });
    }

    try {
      // Fetch the subscription details from Razorpay
      const subscription = await razorpay.subscriptions.fetch(subscriptionId);
      const userId = subscription.notes?.userId; // Assuming userId is stored in notes

      if (!userId || typeof userId !== 'string') {
        console.error('Invalid or missing userId in subscription notes');
        return NextResponse.json({ status: 400, message: 'Invalid userId' });
      }
      console.log('User ID extracted:', userId);

      // Update or create the subscription in the database
      const updatedSubscription = await client.subscription.upsert({
        where: { userId }, // Find by userId
        update: {
          plan: 'PRO', // Change to PRO
          customerId: subscriptionId, // Store the subscription ID
          updatedAt: new Date(),
        },
        create: {
          userId,
          plan: 'PRO', // Start as PRO if new
          customerId: subscriptionId,
        },
      });
      console.log('Subscription updated:', updatedSubscription);

      return NextResponse.json({ status: 200, message: 'Plan updated to PRO' });
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error('Error processing webhook:', error.message);
      } else {
        console.error('Error processing webhook:', String(error));
      }
      return NextResponse.json({ status: 500, message: 'Failed to process webhook' });
    }
  }

  // Ignore other events
  return NextResponse.json({ status: 200, message: 'Event ignored' });
}