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

    // 4. Create a Razorpay subscription using the plan ID.
    const subscription = await razorpay.subscriptions.create({
      plan_id: planId,
      total_count: 12, // e.g., 12 billing cycles
      customer_notify: 1,
      notes: {
        userId: dbUser.id,
        userEmail: dbUser.email
      }
    });
    console.log('Subscription created:', subscription.id, 'for user:', dbUser.id);

    // 5. Upsert subscription in database and immediately set plan to 'PRO'
    await client.subscription.upsert({
      where: { userId: dbUser.id },
      update: { customerId: subscription.id, plan: 'PRO', updatedAt: new Date() },
      create: {
        userId: dbUser.id,
        customerId: subscription.id,
        plan: 'PRO'
      }
    });

    // 6. Create a payment link for the initial payment.
    // Using hardcoded amount ensures that the payment page opens correctly
    // and the payment is tracked in your Razorpay dashboard.
    const paymentLink = await razorpay.paymentLink.create({
      amount: 400, // Amount in paise (₹4.00)
      currency: 'INR',
      description: 'Upgrade to PRO Plan',
      customer: {
        email: dbUser.email,
        name: dbUser.firstname || 'User'
      },
      callback_url: `${process.env.NEXT_PUBLIC_HOST_URL}/payment-success?subscription_id=${subscription.id}`,
      callback_method: 'get',
      notes: {
        userId: dbUser.id,
        subscriptionId: subscription.id
      }
    });
    console.log('Payment link created:', paymentLink.short_url);

    // 7. Return the payment link URL for redirection
    return NextResponse.json({
      status: 200,
      session_url: paymentLink.short_url,
    });
  } catch (error: any) {
    console.error('Payment error:', error.message);
    return NextResponse.json({
      status: 500,
      message: error.message || 'Failed to initiate payment'
    });
  }
}
