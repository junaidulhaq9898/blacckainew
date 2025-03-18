import { NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { client } from '@/lib/prisma';
import { razorpay } from '@/lib/razorpay';

export async function POST() {
  try {
    // 1. Authenticate user via Clerk
    const clerkUser = await currentUser();
    if (!clerkUser) {
      return NextResponse.json({ status: 401, message: 'Unauthorized' });
    }

    // 2. Retrieve user from database
    const dbUser = await client.user.findUnique({
      where: { clerkId: clerkUser.id },
      select: { id: true, email: true, firstname: true }
    });
    if (!dbUser) {
      return NextResponse.json({ status: 404, message: 'User not found' });
    }

    // 3. Validate Razorpay plan ID
    const planId = process.env.RAZORPAY_PLAN_ID;
    if (!planId) {
      console.error('RAZORPAY_PLAN_ID missing');
      return NextResponse.json({ status: 500, message: 'Server configuration error' });
    }

    // 4. Create a payment link for subscription registration
    const paymentLink = await razorpay.paymentLink.create({
      amount: 0, // Amount is 0 for subscription registration; plan ID determines the cost
      currency: 'INR',
      description: 'Upgrade to PRO Plan',
      customer: {
        name: dbUser.firstname || 'User',
        email: dbUser.email
      },
      callback_url: `${process.env.NEXT_PUBLIC_HOST_URL}/dashboard?subscription_id={subscription_id}`,
      callback_method: 'get',
      subscription_registration: {
        plan_id: planId,
        total_count: 12, // e.g., 12 billing cycles
        customer_notify: 1
      },
      notes: {
        userId: dbUser.id,
        userEmail: dbUser.email
      }
    });
    console.log('Payment link created:', paymentLink.id);

    // 5. Return the payment link’s short_url for the client to redirect to
    return NextResponse.json({
      status: 200,
      session_url: paymentLink.short_url
    });
  } catch (error: any) {
    console.error('Payment error:', error.message);
    return NextResponse.json({
      status: 500,
      message: error.message || 'Failed to initiate payment'
    });
  }
}