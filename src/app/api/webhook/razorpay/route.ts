// /api/webhooks/razorpay/route.ts
import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { client } from '@/lib/prisma';
import { razorpay } from '@/lib/razorpay';

export async function POST(request: Request) {
  try {
    // Signature verification (keep existing)
    const body = await request.text();
    const signature = request.headers.get('x-razorpay-signature');
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET!;
    const digest = crypto.createHmac('sha256', secret).update(body).digest('hex');
    if (signature !== digest) return new NextResponse('Invalid signature', { status: 401 });

    const payload = JSON.parse(body);
    if (payload.event !== 'payment.captured') return NextResponse.json({ status: 200 });

    // Extract critical data
    const payment = payload.payload.payment.entity;
    const subscriptionId = payment.subscription_id;
    if (!subscriptionId) return new NextResponse('Missing subscription ID', { status: 400 });

    // Get Razorpay subscription
    const subscription = await razorpay.subscriptions.fetch(subscriptionId);
    const userId = subscription.notes?.userId;
    if (!userId) return new NextResponse('Missing user ID', { status: 400 });

    // Force update using upsert
    await client.subscription.upsert({
      where: { userId },
      update: { 
        plan: 'PRO',
        customerId: subscriptionId,
        updatedAt: new Date()
      },
      create: {
        userId,
        plan: 'PRO',
        customerId: subscriptionId
      }
    });

    console.log(`FORCED PRO UPDATE FOR USER: ${userId}`);
    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Fatal webhook error:', error);
    return new NextResponse('Server error', { status: 500 });
  }
}