import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { client } from '@/lib/prisma';
import { razorpay } from '@/lib/razorpay';

export async function POST(request: Request) {
  try {
    // 1. Read and verify the raw request body
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

    // 2. Parse the webhook payload
    const payload = JSON.parse(body);
    console.log('Webhook event received:', payload.event);

    // 3. Process the payment.captured event
    if (payload.event === 'payment.captured') {
      const payment = payload.payload.payment.entity;
      const subscriptionId = payment.subscription_id;
      if (!subscriptionId) {
        console.error('No subscription ID in payment:', payment);
        return NextResponse.json({ status: 400, message: 'Missing subscription_id' });
      }

      // 4. Fetch the subscription details from Razorpay
      const subscription = await razorpay.subscriptions.fetch(subscriptionId);
      console.log('Fetched subscription:', subscription);

      // 5. Extract userId from the subscription's notes
      const userId = subscription.notes?.userId ? String(subscription.notes.userId) : '';
      console.log('Extracted userId:', userId);

      if (!userId) {
        console.error('Missing userId in subscription notes:', subscription.notes);
        return NextResponse.json({ status: 400, message: 'Missing userId in notes' });
      }

      // 6. Update the subscription record in the database to switch the plan to PRO
      const updatedSubscription = await client.subscription.update({
        where: { userId: userId },
        data: {
          plan: 'PRO',
          customerId: subscriptionId,
          updatedAt: new Date()
        }
      });
      console.log('Subscription updated successfully:', updatedSubscription);

      return NextResponse.json({ status: 200, message: 'Plan updated to PRO' });
    }

    // If event is not payment.captured, return success without processing.
    return NextResponse.json({ status: 200, message: 'Event received but not processed' });
  } catch (error: any) {
    console.error('Webhook processing failed:', error.message);
    return NextResponse.json({ status: 500, message: 'Failed to process webhook' });
  }
}
