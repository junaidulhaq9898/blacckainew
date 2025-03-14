import { NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { client } from '@/lib/prisma';
import { razorpay } from '@/lib/razorpay';
import axios from 'axios';

export async function POST() {
  try {
    // 1. Authenticate the user via Clerk.
    const clerkUser = await currentUser();
    if (!clerkUser) {
      return NextResponse.json({ status: 401, message: 'Unauthorized' });
    }

    // 2. Retrieve the user from your database.
    // We select fields that exist in your schema.
    const dbUser = await client.user.findUnique({
      where: { clerkId: clerkUser.id },
      select: { id: true, email: true, firstname: true }
    });
    if (!dbUser) {
      return NextResponse.json({ status: 404, message: 'User not found' });
    }

    // 3. Validate Razorpay plan ID.
    const planId = process.env.RAZORPAY_PLAN_ID;
    if (!planId) {
      console.error('RAZORPAY_PLAN_ID missing');
      return NextResponse.json({ status: 500, message: 'Server error' });
    }

    // 4. Create a Razorpay subscription using snake_case keys.
    const subscription = await razorpay.subscriptions.create({
      plan_id: planId,
      total_count: 12,
      customer_notify: 1,
      notes: { 
        userId: dbUser.id,
        userEmail: dbUser.email
      }
    });
    console.log('Subscription created:', subscription.id, 'for user:', dbUser.id);

    // 5. Upsert the subscription in your database and mark the plan as PRO.
    await client.subscription.upsert({
      where: { userId: dbUser.id },
      update: { customerId: subscription.id, plan: 'PRO', updatedAt: new Date() },
      create: {
        userId: dbUser.id,
        customerId: subscription.id,
        plan: 'PRO'
      }
    });

    // 6. Validate Razorpay credentials.
    const razorpayKeyId = process.env.RAZORPAY_KEY_ID;
    const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!razorpayKeyId || !razorpayKeySecret) {
      console.error('Razorpay credentials are missing');
      return NextResponse.json({ status: 500, message: 'Server error' });
    }

    // 7. Create a payment link for the subscription.
    // IMPORTANT: In subscription mode, do not include extra fields such as "amount", "currency", "customer", etc.
    const paymentLinkResponse = await axios.post(
      'https://api.razorpay.com/v1/payment_links',
      {
        description: 'PRO Plan Subscription',
        subscription_id: subscription.id,
        callback_url: `${process.env.NEXT_PUBLIC_HOST_URL}/payment-success?subscription_id=${subscription.id}`
      },
      {
        auth: {
          username: razorpayKeyId,
          password: razorpayKeySecret,
        },
      }
    );
    const link = paymentLinkResponse.data;
    console.log('Payment link created:', link);
    return NextResponse.json({
      status: 200,
      session_url: link.short_url
    });
  } catch (error: any) {
    console.error('Payment error:', error.message);
    return NextResponse.json({
      status: 500,
      message: error.message || 'Failed to initiate payment'
    });
  }
}
