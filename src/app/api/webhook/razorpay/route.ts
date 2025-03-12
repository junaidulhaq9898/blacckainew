// /api/webhooks/razorpay/route.ts
import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { client } from '@/lib/prisma';
import { razorpay } from '@/lib/razorpay';

export async function POST(request: Request) {
  try {
    // Verify webhook signature
    const body = await request.text();
    const signature = request.headers.get('x-razorpay-signature');
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET!)
      .update(body)
      .digest('hex');

    if (signature !== expectedSignature) {
      console.error('Invalid signature received');
      return NextResponse.json({ status: 401, message: 'Unauthorized' });
    }

    const payload = JSON.parse(body);
    console.log('Webhook Event:', payload.event);

    // Handle successful payments
    if (payload.event === 'payment.captured') {
      const payment = payload.payload.payment.entity;
      
      // Validate critical payment data
      if (!payment.subscription_id) {
        console.error('Missing subscription ID in payment:', payment.id);
        return NextResponse.json({ status: 400, message: 'Invalid payment data' });
      }

      // Fetch full subscription details
      const subscription = await razorpay.subscriptions.fetch(payment.subscription_id);
      console.log('Subscription Status:', subscription.status);

      // Verify subscription is active
      if (subscription.status !== 'active') {
        console.warn('Subscription not active:', subscription.status);
        return NextResponse.json({ status: 400, message: 'Subscription not active' });
      }

      // Validate user ID format
      const userId = subscription.notes?.userId;
      if (!userId || !/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(userId)) {
        console.error('Invalid user ID format:', userId);
        return NextResponse.json({ status: 400, message: 'Invalid user ID' });
      }

      // Update user subscription plan
      try {
        const updated = await client.subscription.update({
          where: { userId },
          data: {
            plan: 'PRO',
            customerId: subscription.id,
            updatedAt: new Date(),
          },
        });

        console.log('Plan upgraded successfully for user:', userId);
        return NextResponse.json({ 
          status: 200, 
          data: { 
            userId: updated.userId,
            plan: updated.plan 
          } 
        });

      } catch (dbError) {
        console.error('Database update failed:', dbError);
        return NextResponse.json({ 
          status: 500, 
          message: 'Failed to update subscription plan' 
        });
      }
    }

    return NextResponse.json({ status: 200, message: 'Event received' });

  } catch (error) {
    console.error('Webhook processing error:', error);
    return NextResponse.json({ 
      status: 500, 
      message: 'Internal server error' 
    });
  }
}