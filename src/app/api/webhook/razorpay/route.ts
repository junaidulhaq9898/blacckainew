// /api/webhook/razorpay/route.ts (unchanged from your new version)
import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { client } from '@/lib/prisma';
import { razorpay } from '@/lib/razorpay';

export async function POST(request: Request) {
  try {
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

    const payload = JSON.parse(body);
    console.log('Webhook event received:', payload.event);

    if (payload.event === 'payment.captured' || payload.event === 'subscription.charged') {
      const subscriptionId = payload.event === 'payment.captured'
        ? payload.payload.payment.entity.subscription_id
        : payload.payload.subscription.entity.id;
      if (!subscriptionId) {
        console.error('No subscription ID in payload:', payload);
        return NextResponse.json({ status: 400, message: 'Missing subscription_id' });
      }

      const subscription = await razorpay.subscriptions.fetch(subscriptionId);
      const userId = subscription.notes?.userId ? String(subscription.notes.userId) : '';
      if (!userId) {
        console.error('Missing userId in subscription notes:', subscription.notes);
        return NextResponse.json({ status: 400, message: 'Invalid userId' });
      }

      await client.subscription.update({
        where: { userId: userId },
        data: { plan: 'PRO', customerId: subscriptionId, updatedAt: new Date() },
      });
      console.log('Plan updated to PRO for user:', userId);
      return NextResponse.json({ status: 200, message: 'Plan updated to PRO' });
    }

    return NextResponse.json({ status: 200, message: 'Event received but not processed' });
  } catch (error: any) {
    console.error('Webhook error:', error.message);
    return NextResponse.json({ status: 500, message: 'Webhook processing failed' });
  }
}