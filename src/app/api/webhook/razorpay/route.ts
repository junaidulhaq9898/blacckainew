import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { client } from '@/lib/prisma';
import { razorpay } from '@/lib/razorpay';

export async function POST(request: Request) {
  try {
    // 1. Read the raw request body for signature verification.
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

    // 2. Parse the webhook payload.
    const payload = JSON.parse(body);
    console.log('Webhook event received:', payload.event);

    // 3. Handle the payment.captured event.
    if (payload.event === 'payment.captured') {
      const payment = payload.payload.payment.entity;
      const subscriptionId = payment.subscription_id;
      if (!subscriptionId) {
        console.error('No subscription ID in payment:', payment);
        return NextResponse.json({ status: 400, message: 'Missing subscription_id' });
      }

      // 4. Fetch subscription details from Razorpay.
      const subscription = await razorpay.subscriptions.fetch(subscriptionId);
      console.log('Fetched subscription:', subscription);

      // 5. Extract userId from subscription notes.
      const userId = subscription.notes?.userId ? String(subscription.notes.userId) : '';
      if (!userId || !/^[0-9a-f-]{36}$/i.test(userId)) {
        console.error('Invalid or missing userId in subscription notes:', subscription.notes);
        return NextResponse.json({ status: 400, message: 'Invalid userId' });
      }
      console.log('Found userId:', userId);

      // 6. Update the subscription in your database to switch the plan to PRO.
      const updatedSubscription = await client.subscription.update({
        where: { userId },
        data: { plan: 'PRO', customerId: subscriptionId, updatedAt: new Date() }
      });
      console.log('Subscription updated successfully:', updatedSubscription);
      return NextResponse.json({ status: 200, message: 'Plan updated to PRO' });
    }

    return NextResponse.json({ status: 200, message: 'Event received but not processed' });
  } catch (error: any) {
    const errMsg = (error instanceof Error) ? error.message : JSON.stringify(error);
    console.error('Webhook processing failed:', errMsg);
    return NextResponse.json({ status: 500, message: 'Failed to process webhook' });
  }
}
