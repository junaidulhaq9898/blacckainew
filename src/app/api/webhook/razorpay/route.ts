// /Users/junaid/Desktop/slide-webprodigies/src/app/api/webhook/razorpay/route.ts
import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { client } from '@/lib/prisma'; // Adjust this import based on your Prisma setup
import { razorpay } from '@/lib/razorpay'; // Adjust this import based on your Razorpay setup

export async function POST(request: Request) {
  try {
    // Get the raw body and signature for verification
    const body = await request.text();
    const signature = request.headers.get('x-razorpay-signature');
    if (!signature) {
      console.error('No signature provided');
      return NextResponse.json({ status: 400, message: 'Missing signature' });
    }

    // Verify the webhook signature
    const shasum = crypto.createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET!);
    shasum.update(body);
    const digest = shasum.digest('hex');
    if (digest !== signature) {
      console.error('Invalid signature');
      return NextResponse.json({ status: 400, message: 'Invalid signature' });
    }

    // Parse the webhook payload
    const payload = JSON.parse(body);
    console.log('Webhook event received:', payload.event);

    // Handle payment or subscription events
    if (payload.event === 'payment.captured' || payload.event === 'subscription.charged') {
      const subscriptionId =
        payload.payload.payment?.entity?.subscription_id ||
        payload.payload.subscription?.entity?.id;
      if (!subscriptionId) {
        console.error('No subscription ID found');
        return NextResponse.json({ status: 400, message: 'Missing subscription ID' });
      }

      // Fetch subscription details from Razorpay
      const subscription = await razorpay.subscriptions.fetch(subscriptionId);
      const userId = subscription.notes?.userId;
      if (!userId) {
        console.error('No userId in subscription notes');
        return NextResponse.json({ status: 400, message: 'Missing userId' });
      }

      // Update the user’s plan to "PRO"
      await client.subscription.update({
        where: { userId: userId },
        data: { plan: 'PRO', updatedAt: new Date() },
      });
      console.log(`User ${userId} plan updated to PRO`);
      return NextResponse.json({ status: 200, message: 'Plan updated to PRO' });
    }

    return NextResponse.json({ status: 200, message: 'Event received but not processed' });
  } catch (error: any) {
    console.error('Webhook error:', error.message);
    return NextResponse.json({
      status: 500,
      message: 'Failed to process webhook',
    });
  }
}