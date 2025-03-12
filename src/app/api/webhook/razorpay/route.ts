// /api/webhooks/razorpay/route.ts
import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { client } from '@/lib/prisma';
import { razorpay } from '@/lib/razorpay';

export async function POST(request: Request) {
  try {
    // 1. Verify webhook signature (keep existing code)
    const body = await request.text();
    const signature = request.headers.get('x-razorpay-signature');
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET!;
    const digest = crypto.createHmac('sha256', secret).update(body).digest('hex');
    if (signature !== digest) return new NextResponse('Invalid signature', { status: 401 });

    // 2. Process payment event
    const payload = JSON.parse(body);
    if (payload.event !== 'payment.captured') return NextResponse.json({ status: 200 });

    // 3. Extract critical data
    const payment = payload.payload.payment.entity;
    const subscriptionId = payment.subscription_id;
    if (!subscriptionId) return new NextResponse('Missing subscription ID', { status: 400 });

    // 4. Fetch subscription details
    const subscription = await razorpay.subscriptions.fetch(subscriptionId);
    const userId = subscription.notes?.userId;
    if (!userId) return new NextResponse('Missing user ID', { status: 400 });

    // 5. Force update using existing schema
    await client.subscription.updateMany({
      where: { 
        userId: userId,
        plan: 'FREE' // Only update FREE plans
      },
      data: {
        plan: 'PRO',
        customerId: subscriptionId,
        updatedAt: new Date()
      }
    });

    console.log(`FORCED UPDATE TO PRO FOR USER: ${userId}`);
    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Payment processing failed:', error);
    return new NextResponse('Server error', { status: 500 });
  }
}