import { NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { client } from '@/lib/prisma';
import { razorpay } from '@/lib/razorpay';

export async function POST() {
  try {
    // Verify authentication
    const clerkUser = await currentUser();
    if (!clerkUser) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get database user
    const dbUser = await client.user.findUnique({
      where: { clerkId: clerkUser.id },
      select: { id: true }
    });

    if (!dbUser) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      );
    }

    // Validate environment variables
    if (!process.env.RAZORPAY_PLAN_ID) {
      throw new Error('RAZORPAY_PLAN_ID is not configured');
    }

    // Create Razorpay subscription
    const subscription = await razorpay.subscriptions.create({
      plan_id: process.env.RAZORPAY_PLAN_ID,
      total_count: 12,
      notes: {
        userId: dbUser.id,
        email: clerkUser.emailAddresses[0]?.emailAddress
      }
    });

    // Create payment link
    const paymentLink = await razorpay.paymentLink.create({
      amount: 49900,
      currency: 'INR',
      description: 'Blacck AI PRO Subscription',
      subscription_id: subscription.id,
      callback_url: `${process.env.NEXT_PUBLIC_HOST_URL}/payment-success`,
      notes: {
        userId: dbUser.id
      }
    });

    return NextResponse.json({
      success: true,
      url: paymentLink.short_url
    });

  } catch (error: any) {
    console.error('Payment initiation error:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: error.message || 'Failed to start payment'
      },
      { status: 500 }
    );
  }
}