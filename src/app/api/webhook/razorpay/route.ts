import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { razorpay } from '@/lib/razorpay';
import { updateSubscription } from '@/actions/user/queries';

interface RazorpayPayment {
  id: string;
  subscription_id?: string;
}

interface RazorpaySubscription {
  id: string;
  notes?: Record<string, string>;
}

export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get('x-razorpay-signature');

  // Verify webhook signature
  const shasum = crypto.createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET!);
  shasum.update(body);
  const digest = shasum.digest('hex');

  if (digest !== signature) {
    console.error('Invalid webhook signature');
    return NextResponse.json({ status: 400, message: 'Invalid signature' });
  }

  const payload = JSON.parse(body);
  console.log('Webhook event:', payload.event);
  console.log('Webhook payload:', JSON.stringify(payload, null, 2));

  let userId: string | undefined;
  let subscriptionId: string | undefined;

  if (payload.event === 'payment.captured') {
    const payment = payload.payload.payment.entity as RazorpayPayment;
    subscriptionId = payment.subscription_id;

    if (subscriptionId) {
      try {
        const subscription = await razorpay.subscriptions.fetch(subscriptionId);
        userId = (subscription.notes as Record<string, string>)?.userId;
      } catch (error) {
        console.error('Failed to fetch subscription:', error);
        return NextResponse.json({ status: 500, message: 'Failed to fetch subscription' });
      }
    } else {
      console.error('No subscription_id found in payment.captured event');
      return NextResponse.json({ status: 400, message: 'Missing subscription_id' });
    }
  }

  if (!userId) {
    console.error('userId not found in subscription notes');
    return NextResponse.json({ status: 400, message: 'Missing userId' });
  }

  if (!subscriptionId) {
    console.error('subscriptionId not found');
    return NextResponse.json({ status: 400, message: 'Missing subscriptionId' });
  }

  try {
    await updateSubscription(userId, { plan: 'PRO', customerId: subscriptionId });
    console.log(`Updated plan to PRO for user ${userId} with subscription ${subscriptionId}`);
  } catch (error) {
    console.error('Failed to update subscription:', error);
    return NextResponse.json({ status: 500, message: 'Failed to update plan' });
  }

  return NextResponse.json({ status: 200, message: 'Webhook processed' });
}