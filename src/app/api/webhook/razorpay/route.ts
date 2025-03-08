// app/api/webhook/razorpay/route.ts
import { NextResponse } from 'next/server';
import Razorpay from 'razorpay';
import crypto from 'crypto'; // Correct import for Node.js crypto module
import { updateSubscription } from '@/actions/user/queries';

// Initialize Razorpay instance
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

// Function to get subscription ID from order ID (placeholder - implement your logic)
async function getSubscriptionIdFromOrder(orderId: string): Promise<string | null> {
  // Placeholder: Replace with your database query to find subscription ID
  console.log(`Looking up subscription for order ${orderId}`);
  return null; // Implement this based on your database setup
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

  if (payload.event === 'payment.captured') {
    const payment = payload.payload.payment.entity;
    const orderId = payment.order_id;

    try {
      // Fetch order details from Razorpay
      const order = await razorpay.orders.fetch(orderId);
      console.log('Order details:', order);

      // Get the subscription ID linked to this order
      const subscriptionId = await getSubscriptionIdFromOrder(orderId);

      if (subscriptionId) {
        // Fetch subscription details
        const subscription = await razorpay.subscriptions.fetch(subscriptionId);
        console.log('Subscription details:', subscription);

        // Extract userId from subscription notes and ensure it’s a string
        const userIdRaw = subscription.notes?.userId;
        const userId = typeof userIdRaw === 'number' ? userIdRaw.toString() : userIdRaw;

        if (!userId) {
          console.error('Missing userId in subscription notes');
          return NextResponse.json({ status: 400, message: 'Missing userId' });
        }

        // Update the user's plan to PRO
        await updateSubscription(userId, { plan: 'PRO', customerId: subscriptionId });
        console.log(`Updated plan to PRO for user ${userId}`);
      } else {
        console.log('No subscription linked to this order');
      }
    } catch (error) {
      console.error('Error processing payment.captured:', error);
      return NextResponse.json({ status: 500, message: 'Processing failed' });
    }
  } else {
    console.log('Event ignored:', payload.event);
  }

  return NextResponse.json({ status: 200, message: 'Webhook received' });
}