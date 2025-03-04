import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { updateSubscription } from '@/actions/user/queries';

export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get('x-razorpay-signature');

  // Verify webhook signature
  const shasum = crypto.createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET!);
  shasum.update(body);
  const digest = shasum.digest('hex');

  if (digest !== signature) {
    return NextResponse.json({ status: 400, message: 'Invalid signature' });
  }

  const payload = JSON.parse(body);
  const event = payload.event;

  if (event === 'subscription.authenticated' || event === 'subscription.charged') {
    const subscription = payload.payload.subscription.entity;
    const userId = subscription.notes.userId;
    const subscriptionId = subscription.id;
    await updateSubscription(userId, { plan: 'PRO', customerId: subscriptionId });
  }

  return NextResponse.json({ status: 200, message: 'Webhook processed' });
}