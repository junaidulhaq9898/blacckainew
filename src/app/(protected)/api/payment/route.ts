import { NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { client } from '@/lib/prisma';
import { razorpay } from '@/lib/razorpay';

export async function POST() {
  try {
    // 1. Authentication check via Clerk
    const clerkUser = await currentUser();
    if (!clerkUser) {
      return NextResponse.json({ status: 401, message: 'Unauthorized' });
    }

    // 2. Look up the user in the database.
    // Remove "slug" because it is not defined in your Prisma schema.
    const dbUser = await client.user.findUnique({
      where: { clerkId: clerkUser.id },
      select: { id: true, email: true, firstname: true, lastname: true }
    });

    if (!dbUser) {
      return NextResponse.json({ status: 404, message: 'User not found' });
    }

    // 3. Validate Razorpay plan id
    const planId = process.env.RAZORPAY_PLAN_ID;
    if (!planId) {
      console.error('RAZORPAY_PLAN_ID missing');
      return NextResponse.json({ status: 500, message: 'Server error' });
    }

    // 4. Create Razorpay subscription (do not include extra fields such as amount)
    const razorpaySubscription = await razorpay.subscriptions.create({
      plan_id: planId,
      total_count: 12,             // For example, 12 billing cycles
      customer_notify: 1,          // Notify the customer
      notes: {
        user_id: dbUser.id         // Using snake_case key as required by Razorpay
      }
    });

    // 5. Store or update the subscription in the database,
    //    and update the plan to 'PRO'
    await client.subscription.upsert({
      where: { userId: dbUser.id },
      update: { customerId: razorpaySubscription.id, plan: 'PRO' },
      create: {
        userId: dbUser.id,
        customerId: razorpaySubscription.id,
        plan: 'PRO'
      }
    });

    // 6. Create a payment link.
    // When using subscription_id, do not pass an "amount" field.
    const paymentLink = await razorpay.paymentLink.create({
      currency: 'INR',
      description: 'PRO Plan Subscription',
      subscription_id: razorpaySubscription.id,
      callback_url: `${process.env.NEXT_PUBLIC_HOST_URL}/payment-success`,
      customer: {
        email: dbUser.email,
        // Use firstname as fallback for name
        name: dbUser.firstname || 'Customer'
      }
    });

    return NextResponse.json({
      status: 200,
      session_url: paymentLink.short_url
    });
  } catch (error) {
    console.error('Payment error:', error);
    return NextResponse.json({
      status: 500,
      message: error instanceof Error ? error.message : 'Payment failed'
    });
  }
}
