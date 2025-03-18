// src/app/api/razorpay/route.ts
import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { client } from '@/lib/prisma';
import { razorpay } from '@/lib/razorpay';

export async function POST(request: Request) {
  try {
    // 1. Verify signature
    const body = await request.text();
    const signature = request.headers.get('x-razorpay-signature');
    if (!signature) return NextResponse.json({ status: 400, message: 'Missing signature' });

    const shasum = crypto.createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET!);
    shasum.update(body);
    const digest = shasum.digest('hex');
    if (digest !== signature) return NextResponse.json({ status: 400, message: 'Invalid signature' });

    // 2. Process event
    const payload = JSON.parse(body);
    if (payload.event === 'payment.captured') {
      const payment = payload.payload.payment.entity;
      const subscriptionId = payment.subscription_id;
      
      if (!subscriptionId) {
        return NextResponse.json({ status: 400, message: 'Missing subscription ID' });
      }

      // 3. Get subscription details
      const subscription = await razorpay.subscriptions.fetch(subscriptionId);
      const userId = subscription.notes.user_id;

      // 4. Update plan to PRO
      await client.subscription.update({
        where: { customerId: subscriptionId },
        data: { plan: 'PRO' }
      });

      return NextResponse.json({ status: 200, message: 'PRO plan activated' });
    }

    return NextResponse.json({ status: 200, message: 'Unhandled event type' });

  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ status: 500, message: 'Server error' });
  }
}