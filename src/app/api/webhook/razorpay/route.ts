// /api/webhooks/razorpay/route.ts
import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { client } from '@/lib/prisma';
import { razorpay } from '@/lib/razorpay';

export async function POST(request: Request) {
  try {
    // 1. Verify webhook signature
    const body = await request.text();
    const signature = request.headers.get('x-razorpay-signature');
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET!;
    const digest = crypto.createHmac('sha256', secret).update(body).digest('hex');
    if (signature !== digest) return new NextResponse('Invalid signature', { status: 401 });

    // 2. Process payment.captured event
    const payload = JSON.parse(body);
    if (payload.event !== 'payment.captured') return NextResponse.json({ status: 200 });

    // 3. Get critical IDs
    const payment = payload.payload.payment.entity;
    const subscriptionId = payment.subscription_id;
    if (!subscriptionId) return new NextResponse('Missing subscription ID', { status: 400 });

    // 4. Force update existing subscription
    await client.subscription.update({
      where: {
        customerId: subscriptionId // Match Razorpay subscription ID
      },
      data: {
        plan: 'PRO' // Only update this field
      }
    });

    console.log(`PRO plan activated for subscription: ${subscriptionId}`);
    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Webhook error:', error);
    return new NextResponse('Server error', { status: 500 });
  }
}