import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { client } from '@/lib/prisma';
import { razorpay } from '@/lib/razorpay';

export async function POST(request: Request) {
  try {
    // 1. Verify webhook signature
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
      console.error('Signature mismatch. Expected:', digest, 'Received:', signature);
      return NextResponse.json({ status: 400, message: 'Invalid signature' });
    }

    // 2. Parse the webhook payload
    const payload = JSON.parse(body);
    console.log('Webhook payload:', payload);

    // 3. Handle payment.captured event
    if (payload.event === 'payment.captured') {
      const payment = payload.payload.payment.entity;
      const subscriptionId = payment.subscription_id;
      if (!subscriptionId) {
        console.error('No subscription ID in payment:', payment);
        return NextResponse.json({ status: 400, message: 'Missing subscription_id' });
      }

      // 4. Fetch subscription details
      const subscription = await razorpay.subscriptions.fetch(subscriptionId);
      console.log('Subscription details:', subscription);

      // 5. Extract userId from notes
      const userId = subscription.notes?.userId ? String(subscription.notes.userId) : '';
      if (!userId || !/^[0-9a-f-]{36}$/i.test(userId)) {
        console.error('Invalid or missing userId in notes:', subscription.notes);
        return NextResponse.json({ status: 400, message: 'Invalid userId' });
      }
      console.log('Processing for userId:', userId);

      // 6. Update the subscription plan to 'PRO'
      const updatedSubscription = await client.subscription.update({
        where: { userId: userId },
        data: { plan: 'PRO', customerId: subscriptionId, updatedAt: new Date() }
      });
      console.log('Updated subscription:', updatedSubscription);
      return NextResponse.json({ status: 200, message: 'Plan updated to PRO' });
    }

    return NextResponse.json({ status: 200, message: 'Event received but not processed' });
  } catch (error: any) {
    console.error('Webhook error:', error.message);
    return NextResponse.json({ status: 500, message: 'Failed to process webhook' });
  }
}