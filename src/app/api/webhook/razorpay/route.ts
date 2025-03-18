import { NextResponse } from 'next/server';
import { client } from '@/lib/prisma'; // Add missing import
import { razorpay } from '@/lib/razorpay'; // Add missing import
import crypto from 'crypto';

export async function POST(request: Request) {
  try {
    // 1. Verify webhook signature
    const body = await request.text();
    const signature = request.headers.get('x-razorpay-signature');
    if (!signature) {
      return NextResponse.json({ status: 400, message: 'Missing signature' });
    }

    const shasum = crypto.createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET!);
    shasum.update(body);
    const digest = shasum.digest('hex');
    
    if (digest !== signature) {
      return NextResponse.json({ status: 400, message: 'Invalid signature' });
    }

    // 2. Process webhook event
    const payload = JSON.parse(body);
    if (payload.event === 'payment.captured') {
      const payment = payload.payload.payment.entity;
      const subscriptionId = payment.subscription_id; // Declare subscriptionId
      
      if (!subscriptionId) {
        return NextResponse.json({ status: 400, message: 'Missing subscription ID' });
      }

      // 3. Fetch subscription details
      const subscription = await razorpay.subscriptions.fetch(subscriptionId);
      const userId = subscription.notes.user_id;

      // 4. Update subscription plan
      await client.subscription.update({
        where: { customerId: subscriptionId },
        data: { 
          plan: 'PRO',
          updatedAt: new Date()
        }
      });

      return NextResponse.json({ status: 200, message: 'PRO plan activated' });
    }

    return NextResponse.json({ status: 200, message: 'Event ignored' });
    
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ status: 500, message: 'Server error' });
  }
}