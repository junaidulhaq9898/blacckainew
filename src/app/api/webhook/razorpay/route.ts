import { NextResponse } from 'next/server';
import { razorpay } from '@/lib/razorpay'; // Your Razorpay setup
import { client } from '@/lib/prisma';     // Your database connection
import crypto from 'crypto';

export async function POST(request: Request) {
  try {
    // Verify the webhook is really from Razorpay
    const body = await request.text();
    const signature = request.headers.get('x-razorpay-signature');
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET!;
    
    const shasum = crypto.createHmac('sha256', secret);
    shasum.update(body);
    const digest = shasum.digest('hex');
    
    if (digest !== signature) {
      console.error('Invalid signature');
      return NextResponse.json({ status: 400, message: 'Invalid signature' });
    }

    // Get the event data
    const payload = JSON.parse(body);
    
    // Only handle payment.captured events
    if (payload.event === 'payment.captured') {
      // Get subscriptionId from the payment
      const subscriptionId = payload.payload.payment.entity.subscription_id;
      console.log('Payment for subscription:', subscriptionId);

      // Use subscriptionId to get the Razorpay subscription and find userId
      const subscription = await razorpay.subscriptions.fetch(subscriptionId);
      const userId = subscription.notes?.userId;

      if (!userId || typeof userId !== 'string') {
        console.error('No userId found');
        return NextResponse.json({ status: 400, message: 'No userId' });
      }
      console.log('Found user:', userId);

      // Update the subscription plan to PRO using userId
      await client.subscription.update({
        where: { userId: userId },
        data: { plan: 'PRO', updatedAt: new Date() },
      });
      console.log('Plan updated to PRO for user:', userId);

      return NextResponse.json({ status: 200, message: 'Plan updated to PRO' });
    }

    return NextResponse.json({ status: 200, message: 'Event ignored' });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ status: 500, message: 'Something went wrong' });
  }
}