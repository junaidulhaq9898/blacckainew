// src/app/api/razorpay/route.ts

import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { client } from '@/lib/prisma';
import { razorpay } from '@/lib/razorpay';

export async function POST(request: Request) {
  try {
    // Read the raw request body as text (needed for signature verification)
    const body = await request.text();

    // Retrieve the Razorpay signature from the request headers
    const signature = request.headers.get('x-razorpay-signature');
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET!;  // Ensure this env var is set

    // Compute the HMAC digest using the secret
    const digest = crypto.createHmac('sha256', secret).update(body).digest('hex');

    // If the computed digest does not match the header signature, reject the request
    if (signature !== digest) {
      console.error('Invalid signature:', { signature, digest });
      return new NextResponse('Invalid signature', { status: 401 });
    }

    // Parse the JSON payload
    const payload = JSON.parse(body);
    console.log('Razorpay webhook payload:', JSON.stringify(payload, null, 2));

    // Check if the event is "payment.captured"
    if (payload.event === 'payment.captured') {
      const payment = payload.payload.payment.entity;
      const subscriptionId = payment.subscription_id;

      // Fetch the subscription details from Razorpay
      const subscription = await razorpay.subscriptions.fetch(subscriptionId);
      console.log('Fetched subscription:', subscription);

      // Retrieve the user ID from the subscription notes (ensure that you used snake_case during creation)
      const userId = subscription.notes.user_id;

      // Validate the user ID format (expecting a UUID)
      if (!userId || !/^[0-9a-f-]{36}$/i.test(userId)) {
        console.error('Invalid user ID in subscription notes:', userId);
        return new NextResponse('Invalid user ID', { status: 400 });
      }

      // Update the subscription in your database to switch the plan to 'PRO'
      const updated = await client.subscription.updateMany({
        where: { customerId: subscriptionId },
        data: { plan: 'PRO' }
      });

      console.log(`Upgraded user ${userId} to PRO plan. Update result:`, updated);
      return NextResponse.json({ success: true });
    }

    // For non-payment events, simply respond with status 200
    return NextResponse.json({ status: 200 });
  } catch (error) {
    console.error('Webhook error:', error);
    return new NextResponse('Server error', { status: 500 });
  }
}
