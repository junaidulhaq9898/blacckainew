import { NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { client } from '@/lib/prisma';
import { razorpay } from '@/lib/razorpay';

export async function POST() {
  try {
    // 1. Authenticate user
    const clerkUser = await currentUser();
    if (!clerkUser) {
      return NextResponse.json({ status: 401, message: 'Unauthorized' });
    }

    // 2. Get database user
    const dbUser = await client.user.findUnique({
      where: { clerkId: clerkUser.id },
      select: { id: true, email: true, firstname: true }
    });

    if (!dbUser) {
      return NextResponse.json({ status: 404, message: 'User not found' });
    }

    // 3. Validate environment variables
    const planId = process.env.RAZORPAY_PLAN_ID;
    const hostUrl = process.env.NEXT_PUBLIC_HOST_URL;
    
    if (!planId) throw new Error('RAZORPAY_PLAN_ID missing');
    if (!hostUrl) throw new Error('NEXT_PUBLIC_HOST_URL missing');

    // 4. Create Razorpay subscription
    const subscription = await razorpay.subscriptions.create({
      plan_id: planId,
      total_count: 12,
      customer_notify: 1,
      notes: {
        userId: dbUser.id,
        userEmail: dbUser.email
      },
      start_at: Math.floor(Date.now() / 1000), // Start immediately
    });

    // 5. Validate invoice creation
    if (!subscription.first_invoice?.id) {
      throw new Error('Failed to generate initial invoice');
    }

    // 6. Create payment link
    const paymentLink = await razorpay.paymentLink.create({
      invoice_id: subscription.first_invoice.id,
      callback_url: `${hostUrl}/payment-success?subscription_id=${subscription.id}`,
      callback_method: 'get',
      notes: {
        userId: dbUser.id,
        subscriptionId: subscription.id
      }
    });

    // 7. Update database
    await client.subscription.upsert({
      where: { userId: dbUser.id },
      update: { customerId: subscription.id },
      create: {
        userId: dbUser.id,
        customerId: subscription.id,
        plan: 'FREE'
      }
    });

    return NextResponse.json({
      status: 200,
      session_url: paymentLink.short_url
    });

  } catch (error: any) {
    console.error('Payment Error:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });

    return NextResponse.json({
      status: 500,
      message: error.message || 'Payment initialization failed'
    });
  }
}