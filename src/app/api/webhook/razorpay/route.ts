import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { client } from '@/lib/prisma';
import { razorpay } from '@/lib/razorpay';

export async function POST(request: Request) {
  try {
    // Verify webhook signature
    const body = await request.text();
    const signature = request.headers.get('x-razorpay-signature');
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET!;
    const digest = crypto.createHmac('sha256', secret).update(body).digest('hex');
    if (signature !== digest) return new NextResponse('Invalid signature', { status: 401 });

    // Process payment captured event
    const payload = JSON.parse(body);
    if (payload.event === 'payment.captured') {
      const payment = payload.payload.payment.entity;
      const subscriptionId = payment.subscription_id;

      // Get subscription details
      const subscription = await razorpay.subscriptions.fetch(subscriptionId);
      const userId = subscription.notes.user_id; // Match snake_case from creation

      // Validate user ID format
      if (!userId || !/^[0-9a-f-]{36}$/i.test(userId)) {
        return new NextResponse('Invalid user ID', { status: 400 });
      }

      // Force update subscription plan
      await client.subscription.updateMany({
        where: { customerId: subscriptionId },
        data: { plan: 'PRO' }
      });

      console.log(`Upgraded user ${userId} to PRO plan`);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ status: 200 });

  } catch (error) {
    console.error('Webhook error:', error);
    return new NextResponse('Server error', { status: 500 });
  }
}