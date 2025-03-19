import { NextRequest, NextResponse } from 'next/server';
import { client } from '@/lib/prisma';
import Razorpay from 'razorpay';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const event = body.event;

    if (event === 'payment.captured') {
      const payment = body.payload.payment.entity;
      const subscriptionId = payment.subscription_id;

      if (!subscriptionId) {
        console.error('No subscription_id in payment webhook');
        return NextResponse.json({ status: 400, message: 'Missing subscription_id' });
      }

      // Find the subscription in your database
      const subscription = await client.subscription.findUnique({
        where: { customerId: subscriptionId },
        select: { userId: true, plan: true }
      });

      if (!subscription) {
        console.error('Subscription not found for ID:', subscriptionId);
        return NextResponse.json({ status: 404, message: 'Subscription not found' });
      }

      // Update the plan to "PRO" if it's still "FREE"
      if (subscription.plan !== 'PRO') {
        await client.subscription.update({
          where: { customerId: subscriptionId },
          data: { plan: 'PRO' }
        });
        console.log(`Plan updated to PRO for userId: ${subscription.userId}`);
      }

      return NextResponse.json({ status: 200, message: 'Webhook processed' });
    }

    // Ignore other events
    return NextResponse.json({ status: 200, message: 'Event ignored' });
  } catch (error: any) {
    console.error('Webhook error:', error);
    return NextResponse.json({
      status: 500,
      message: error.message || 'Failed to process webhook'
    });
  }
}