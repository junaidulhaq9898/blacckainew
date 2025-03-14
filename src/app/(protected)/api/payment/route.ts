import { NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { client } from '@/lib/prisma';
import { razorpay } from '@/lib/razorpay';

export async function POST(request: Request) {
  // Get the authenticated Clerk user
  const clerkUser = await currentUser();
  if (!clerkUser) {
    return NextResponse.json({ status: 401, message: 'Unauthorized' });
  }

  // Fetch the database user using Clerk's user ID
  const dbUser = await client.user.findUnique({
    where: { clerkId: clerkUser.id }
  });
  
  if (!dbUser) {
    return NextResponse.json({ status: 404, message: 'User not found' });
  }

  const planId = process.env.RAZORPAY_PLAN_ID;
  if (!planId) {
    console.error('RAZORPAY_PLAN_ID is not set');
    return NextResponse.json({ status: 500, message: 'Server configuration error' });
  }

  try {
    // Create a subscription first
    const subscription = await razorpay.subscriptions.create({
      plan_id: planId,
      customer_notify: 1,
      total_count: 12, // 12 months
      notes: { 
        userId: dbUser.id, // Important: Store the UUID from your database
        userEmail: dbUser.email
      }
    });

    console.log('Subscription created:', subscription.id, 'for user:', dbUser.id);

    // Create a payment link for the initial payment
    const paymentLink = await razorpay.paymentLink.create({
      amount: 50000, // Amount in paise
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

    return NextResponse.json({
      status: 200,
      session_url: paymentLink.short_url,
    });
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error('Payment link creation error:', error.message);
    } else {
      console.error('Payment link creation error:', String(error));
    }
    return NextResponse.json({ status: 500, message: 'Failed to initiate payment' });
  }
}
