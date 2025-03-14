import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { client } from '@/lib/prisma';
import { razorpay } from '@/lib/razorpay';

export async function POST(request: Request) {
  try {
    // 1. Read the raw request body
    const body = await request.text();
    const signature = request.headers.get('x-razorpay-signature');

    if (!signature) {
      return NextResponse.json({ status: 400, message: 'Missing signature' });
    }

    // 2. Verify Razorpay signature
    const shasum = crypto.createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET!);
    shasum.update(body);
    const digest = shasum.digest('hex');

    if (digest !== signature) {
      return NextResponse.json({ status: 400, message: 'Invalid signature' });
    }

    // 3. Parse Webhook Payload
    const payload = JSON.parse(body);
    console.log('Webhook event:', payload.event);

    if (payload.event === 'payment.captured') {
      const payment = payload.payload.payment.entity;
      const subscriptionId = payment.subscription_id;

      if (!subscriptionId) {
        return NextResponse.json({ status: 400, message: 'Missing subscription_id' });
      }

      // 4. Fetch Subscription from Razorpay
      const subscription = await razorpay.subscriptions.fetch(subscriptionId);
      console.log('Fetched subscription:', subscription);

      // 5. Extract userId from Subscription notes
      const userId = subscription.notes?.user_id;
      if (!userId) {
        return NextResponse.json({ status: 400, message: 'Invalid userId' });
      }

      console.log('User ID:', userId);

      // 6. Update the Subscription in Database
      await client.subscription.update({
        where: { userId },
        data: { plan: 'PRO', customerId: subscriptionId, updatedAt: new Date() },
      });

      return NextResponse.json({ status: 200, message: 'Subscription upgraded to PRO' });
    }

    return NextResponse.json({ status: 200, message: 'Webhook event processed' });
  } catch (error) {
    console.error('Webhook processing failed:', error);
    return NextResponse.json({ status: 500, message: 'Failed to process webhook' });
  }
}
