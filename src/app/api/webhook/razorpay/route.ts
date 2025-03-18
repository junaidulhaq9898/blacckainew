import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { client } from '@/lib/prisma';

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
      console.error('Invalid signature');
      return NextResponse.json({ status: 400, message: 'Invalid signature' });
    }

    // 2. Parse the webhook payload
    const payload = JSON.parse(body);
    console.log('Webhook event received:', payload.event);

    // 3. Handle subscription.activated event
    if (payload.event === 'subscription.activated') {
      const subscription = payload.payload.subscription.entity;
      const userId = subscription.notes?.userId;
      if (!userId) {
        console.error('No userId in subscription notes');
        return NextResponse.json({ status: 400, message: 'Missing userId' });
      }

      // 4. Upsert the subscription in the database with plan 'PRO'
      await client.subscription.upsert({
        where: { userId: userId },
        update: { customerId: subscription.id, plan: 'PRO', updatedAt: new Date() },
        create: {
          userId: userId,
          customerId: subscription.id,
          plan: 'PRO'
        }
      });

      console.log('Subscription activated and updated for user:', userId);
      return NextResponse.json({ status: 200, message: 'Plan updated to PRO' });
    }

    return NextResponse.json({ status: 200, message: 'Event received but not processed' });
  } catch (error: any) {
    console.error('Webhook processing failed:', error.message);
    return NextResponse.json({ status: 500, message: 'Failed to process webhook' });
  }
}