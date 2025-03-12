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
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET!;
    
    const generatedSignature = crypto
      .createHmac('sha256', secret)
      .update(body)
      .digest('hex');

    if (signature !== generatedSignature) {
      return NextResponse.json({ status: 401, message: 'Invalid signature' }, { status: 401 });
    }

    const payload = JSON.parse(body);
    
    // Only process successful payments
    if (payload.event === 'payment.captured') {
      const payment = payload.payload.payment.entity;
      const subscriptionId = payment.subscription_id;

      if (!subscriptionId) {
        return NextResponse.json({ status: 400, message: 'Missing subscription ID' }, { status: 400 });
      }

      // Fetch subscription details
      const subscription = await razorpay.subscriptions.fetch(subscriptionId);
      const userId = subscription.notes?.userId;

      // Validate UUID format
      if (!userId || !/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(userId)) {
        return NextResponse.json({ status: 400, message: 'Invalid user ID format' }, { status: 400 });
      }

      // Update subscription plan using raw SQL to bypass Prisma issues
      try {
        const updateResult = await client.$executeRaw`
          UPDATE "Subscription" 
          SET 
            plan = 'PRO',
            "customerId" = ${subscriptionId},
            "updatedAt" = NOW()
          WHERE "userId" = ${userId}::uuid
        `;

        if (updateResult === 0) {
          console.error('No subscription found for user:', userId);
          return NextResponse.json({ status: 404, message: 'Subscription not found' }, { status: 404 });
        }

        console.log('Successfully upgraded plan for user:', userId);
        return NextResponse.json({ status: 200, message: 'Plan upgraded successfully' });

      } catch (dbError) {
        console.error('Database update failed:', dbError);
        return NextResponse.json({ status: 500, message: 'Failed to update subscription' }, { status: 500 });
      }
    }

    return NextResponse.json({ status: 200, message: 'Event received' });

  } catch (error) {
    console.error('Webhook processing failed:', error);
    return NextResponse.json({ status: 500, message: 'Internal server error' }, { status: 500 });
  }
}