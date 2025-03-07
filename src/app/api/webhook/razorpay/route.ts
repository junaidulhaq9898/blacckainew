// app/api/webhooks/razorpay/route.ts
import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { updateSubscription } from '@/actions/user/queries'; // Your DB update function

export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get('x-razorpay-signature');

  // Verify webhook signature
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) {
    console.error('Webhook secret not set');
    return NextResponse.json({ status: 500, message: 'Server error' });
  }

  const shasum = crypto.createHmac('sha256', secret);
  shasum.update(body);
  const digest = shasum.digest('hex');

  if (digest !== signature) {
    console.error('Invalid webhook signature');
    return NextResponse.json({ status: 400, message: 'Invalid signature' });
  }

  const payload = JSON.parse(body);
  const event = payload.event;

  if (event === 'payment_link.paid') {
    const paymentLink = payload.payload.payment_link.entity;
    const subscriptionId = paymentLink.subscription_id;
    const userId = paymentLink.notes?.userId;

    if (!userId) {
      console.error('userId not found in payment link notes');
      return NextResponse.json({ status: 400, message: 'Missing userId' });
    }

    // Update user's plan to PRO
    try {
      await updateSubscription(userId, { plan: 'PRO', customerId: subscriptionId });
      console.log(`Updated plan to PRO for user ${userId}`);
    } catch (error) {
      console.error('Failed to update subscription:', error);
      return NextResponse.json({ status: 500, message: 'Failed to update plan' });
    }
  }

  return NextResponse.json({ status: 200, message: 'Webhook processed' });
}