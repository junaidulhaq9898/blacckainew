import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { client } from '@/lib/prisma';
import { razorpay } from '@/lib/razorpay';

export async function POST(request: Request) {
  try {
    // 1. Verify signature
    const body = await request.text();
    const signature = request.headers.get('x-razorpay-signature') || '';
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET || '';

    const shasum = crypto.createHmac('sha256', secret);
    shasum.update(body);
    const digest = shasum.digest('hex');

    if (digest !== signature) {
      console.error('Invalid webhook signature');
      return NextResponse.json({ status: 400, message: 'Invalid signature' });
    }

    // 2. Process payload
    const payload = JSON.parse(body);
    console.log('Webhook Event:', payload.event);

    // 3. Handle payment success
    if (payload.event === 'payment.captured') {
      const payment = payload.payload.payment.entity;
      const subscriptionId = payment.subscription_id;

      if (!subscriptionId) {
        return NextResponse.json({ status: 400, message: 'Missing subscription ID' });
      }

      // 4. Get subscription details
      const subscription = await razorpay.subscriptions.fetch(subscriptionId);
      const userId = subscription.notes.userId;

      if (!userId) {
        return NextResponse.json({ status: 400, message: 'User ID not found' });
      }

      // 5. Update user plan
      await client.subscription.update({
        where: { userId: String(userId) },
        data: {
          plan: 'PRO',
          customerId: subscriptionId,
          updatedAt: new Date()
        }
      });

      console.log(`Updated user ${userId} to PRO plan`);
    }

    return NextResponse.json({ status: 200, message: 'Webhook processed' });

  } catch (error: any) {
    console.error('Webhook Error:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });

    return NextResponse.json({
      status: 500,
      message: 'Internal server error'
    });
  }
}