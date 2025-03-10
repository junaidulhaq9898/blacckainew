// src/app/api/webhooks/razorpay/route.ts
import { NextResponse } from 'next/server';
import * as crypto from 'crypto';
import { client } from '@/lib/prisma';
import { razorpay } from '@/lib/razorpay';

export async function POST(request: Request) {
  try {
    // Get the webhook body and signature
    const body = await request.text();
    const signature = request.headers.get('x-razorpay-signature');
    
    if (!signature) {
      console.error('Missing signature in webhook request');
      return NextResponse.json({ status: 400, message: 'Missing signature' });
    }

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

      // Fetch the subscription details from Razorpay
      const subscription = await razorpay.subscriptions.fetch(subscriptionId);
      
      // Extract the userId from notes
      const userId = subscription.notes?.userId;
      
      if (!userId || typeof userId !== 'string') {
        console.error('Invalid or missing userId in subscription notes:', subscription.notes);
        return NextResponse.json({ status: 400, message: 'Invalid userId' });
      }
      
      console.log('Processing subscription update for user:', userId);

      // First check if the user exists
      const user = await client.user.findUnique({
        where: { id: userId },
        include: { subscription: true }
      });

      if (!user) {
        console.error('User not found in database:', userId);
        return NextResponse.json({ status: 404, message: 'User not found' });
      }

      // Update user's subscription
      if (user.subscription) {
        // Update existing subscription
        const updated = await client.subscription.update({
          where: { id: user.subscription.id },
          data: {
            plan: 'PRO',
            customerId: subscriptionId,
            updatedAt: new Date()
          }
        });
        console.log('Subscription updated:', updated);
      } else {
        // Create new subscription
        const created = await client.subscription.create({
          data: {
            userId: userId,
            plan: 'PRO',
            customerId: subscriptionId
          }
        });
        console.log('Subscription created:', created);
      }

      return NextResponse.json({ status: 200, message: 'Plan updated to PRO' });
    }

    // For all other events, just acknowledge receipt
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