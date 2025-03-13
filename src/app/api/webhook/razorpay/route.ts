// src/app/api/razorpay/route.ts
import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { client } from '@/lib/prisma';
import { razorpay } from '@/lib/razorpay';

export async function POST(request: Request) {
  try {
    // Read the raw request body as text (needed for signature verification)
    const body = await request.text();
    const signature = request.headers.get('x-razorpay-signature');
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET!;
    const digest = crypto.createHmac('sha256', secret).update(body).digest('hex');

    if (signature !== digest) {
      console.error('Invalid signature:', { signature, digest });
      return new NextResponse('Invalid signature', { status: 401 });
    }

    const payload = JSON.parse(body);
    console.log('Razorpay webhook payload:', JSON.stringify(payload, null, 2));

    if (payload.event === 'payment.captured') {
      const payment = payload.payload.payment.entity;
      const subscriptionId = payment.subscription_id;
      
      // Fetch the subscription details from Razorpay
      const subscription = await razorpay.subscriptions.fetch(subscriptionId);
      console.log('Fetched subscription:', subscription);

      // Safely access the user_id from subscription notes and convert to string if needed
      const userId = subscription.notes?.user_id ? String(subscription.notes.user_id) : '';
      if (!userId || !/^[0-9a-f-]{36}$/i.test(userId)) {
        console.error('Invalid user ID in subscription notes:', userId);
        return new NextResponse('Invalid user ID', { status: 400 });
      }

      // Update the subscription in your database to switch the plan to 'PRO'
      const updated = await client.subscription.updateMany({
        where: { customerId: subscriptionId },
        data: { plan: 'PRO' }
      });
      console.log(`Upgraded user ${userId} to PRO plan. Update result:`, updated);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ status: 200 });
  } catch (error) {
    console.error('Webhook error:', error);
    return new NextResponse('Server error', { status: 500 });
  }
}
