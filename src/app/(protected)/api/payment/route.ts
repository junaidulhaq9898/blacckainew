import { NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { getUserByClerkId } from '@/actions/user/queries';
import { razorpay } from '@/lib/razorpay'; // Razorpay client setup

export async function POST(request: Request) {
  // Get the authenticated Clerk user
  const clerkUser = await currentUser();
  if (!clerkUser) {
    return NextResponse.json({ status: 401, message: 'Unauthorized' });
  }

  // Fetch the database user using Clerk's user ID
  const dbUser = await getUserByClerkId(clerkUser.id);
  if (!dbUser) {
    return NextResponse.json({ status: 404, message: 'User not found' });
  }

  const planId = process.env.RAZORPAY_PLAN_ID;
  if (!planId) {
    console.error('RAZORPAY_PLAN_ID is not set');
    return NextResponse.json({ status: 500, message: 'Server configuration error' });
  }

  try {
    // Create a Razorpay subscription with userId in notes
    const subscription = await razorpay.subscriptions.create({
      plan_id: planId,
      customer_notify: 1,
      total_count: 12,
      notes: { userId: dbUser.id }, // Store the UUID from your database
    });

    // Create a payment link for the subscription
    const paymentLink = await razorpay.paymentLink.create({
      amount: 50000, // Amount in paise (e.g., 500 INR = 50000 paise)
      currency: 'INR',
      description: 'Upgrade to PRO Plan',
      customer: { email: dbUser.email },
      callback_url: `https://www.blacckai.com/payment-success?subscription_id=${subscription.id}`,
      callback_method: 'get',
      notes: { userId: dbUser.id }, // Also store userId in payment link notes
    });

    return NextResponse.json({
      status: 200,
      session_url: paymentLink.short_url, // Redirect user to this URL
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