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

    // 3. Handle the payment.captured event
    if (payload.event === 'payment.captured' || payload.event === 'payment_link.paid') {
      const payment = payload.payload.payment?.entity || payload.payload.payment_link?.entity;
      
      // Extract userId from notes
      const userId = payment?.notes?.userId;
      if (!userId) {
        console.error('No userId found in payment notes:', payment?.notes);
        return NextResponse.json({ status: 400, message: 'Missing userId in payment notes' });
      }
      
      console.log('Found userId:', userId);

      // 4. Update the subscription to PRO
      const updatedSubscription = await client.subscription.update({
        where: { userId: userId },
        data: { plan: 'PRO', updatedAt: new Date() }
      });
      
      console.log('Subscription updated successfully:', updatedSubscription);
      return NextResponse.json({ status: 200, message: 'Plan updated to PRO' });
    }

    return NextResponse.json({ status: 200, message: 'Event received but not processed' });
  } catch (error: any) {
    console.error('Webhook processing failed:', error.message, error.stack);
    return NextResponse.json({ status: 500, message: 'Failed to process webhook' });
  }
}