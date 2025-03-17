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
    const dbUser = await client.user.findUnique({
      where: { clerkId: clerkUser.id },
      // We only need these fields for payment.
      select: { id: true, email: true, firstname: true }
    });
    if (!dbUser) {
      return NextResponse.json({ status: 404, message: 'User not found' });
    }

    // 3. Validate Razorpay plan ID.
    const planId = process.env.RAZORPAY_PLAN_ID;
    if (!planId) {
      console.error('RAZORPAY_PLAN_ID missing');
      return NextResponse.json({ status: 500, message: 'Server configuration error' });
    }

    // 4. Create a Razorpay subscription.
    // (Use the exact snake_case keys as required by Razorpay.)
    const subscription = await razorpay.subscriptions.create({
      plan_id: planId,
      total_count: 12, // e.g., 12 billing cycles (months)
      customer_notify: 1,
      notes: { 
        userId: dbUser.id,        // exactly "userId"
        userEmail: dbUser.email
      }
    });
    console.log('Subscription created:', subscription.id, 'for user:', dbUser.id);

    // 5. Upsert the subscription in your database.
    // (We store it with plan "FREE" so that the webhook will later update it to "PRO" after payment.)
    await client.subscription.upsert({
      where: { userId: dbUser.id },
      update: { customerId: subscription.id, updatedAt: new Date() },
      create: {
        userId: dbUser.id,
        customerId: subscription.id,
        plan: 'FREE'
      }
    });

    // 6. Create a payment link for the subscription.
    // IMPORTANT: When using subscription_id, do NOT send fields like amount, currency, or callback_method.
    const paymentLinkResponse = await razorpay.paymentLink.create({
      description: 'Upgrade to PRO Plan',
      subscription_id: subscription.id,
      callback_url: `${process.env.NEXT_PUBLIC_HOST_URL}/payment-success?subscription_id=${subscription.id}`,
      notes: {
        userId: dbUser.id,
        subscriptionId: subscription.id
      }
    } as any); // Casting as any to allow snake_case keys.

    // The payment link object is expected to include a property "short_url".
    const link = paymentLinkResponse as any;
    console.log('Payment link created:', link.short_url);

    return NextResponse.json({
      status: 200,
      session_url: link.short_url,
    });
  } catch (error: any) {
    // Some error objects may not have a "message" property.
    const errMsg = (error instanceof Error) ? error.message : JSON.stringify(error);
    console.error('Payment error:', errMsg);
    return NextResponse.json({
      status: 500,
      message: errMsg || 'Failed to initiate payment'
    });
  }
}
