import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { client } from '@/lib/prisma';
import { razorpay } from '@/lib/razorpay';

export async function POST(request: Request) {
  try {
    // Signature verification
    const body = await request.text();
    const signature = request.headers.get('x-razorpay-signature');
    if (!signature) return NextResponse.json({ status: 400, message: 'Missing signature' });

    const shasum = crypto.createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET!);
    shasum.update(body);
    const digest = shasum.digest('hex');
    if (digest !== signature) return NextResponse.json({ status: 400, message: 'Invalid signature' });

    // Process event
    const payload = JSON.parse(body);
    if (payload.event === 'payment.captured') {
      const payment = payload.payload.payment.entity;
      const subscriptionId = payment.subscription_id;
      
      if (!subscriptionId) return NextResponse.json({ status: 400, message: 'Missing subscription ID' });

      // Fetch subscription details
      const subscription = await razorpay.subscriptions.fetch(subscriptionId);
      const userId = subscription.notes.user_id; // Match snake_case

      // Validate user ID
      if (!userId || !/^[0-9a-f-]{36}$/i.test(userId)) {
        return NextResponse.json({ status: 400, message: 'Invalid user ID' });
      }

      // Update to PRO (from old code)
      await client.subscription.update({
        where: { customerId: subscriptionId },
        data: { 
          plan: 'PRO',
          updatedAt: new Date()
        }
      });

      return NextResponse.json({ status: 200, message: 'PRO plan activated' });
    }

    return NextResponse.json({ status: 200, message: 'Event ignored' });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ status: 500, message: 'Server error' });
  }
}