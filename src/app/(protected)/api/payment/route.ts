import { NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { client } from '@/lib/prisma';
import { razorpay } from '@/lib/razorpay';

export async function POST() {
  try {
    // 1. Authentication
    const clerkUser = await currentUser();
    if (!clerkUser) {
      return NextResponse.json({ status: 401, message: 'Unauthorized' });
    }

    // 2. Database Lookup
    const dbUser = await client.user.findUnique({
      where: { clerkId: clerkUser.id },
      select: { id: true, email: true, firstname: true }
    });
    if (!dbUser) {
      return NextResponse.json({ status: 404, message: 'User not found' });
    }

    // 3. Validate Configuration
    const planId = process.env.RAZORPAY_PLAN_ID;
    const hostUrl = process.env.NEXT_PUBLIC_HOST_URL;
    if (!planId || !hostUrl) {
      throw new Error('Missing environment configuration');
    }

    // 4. Fetch Plan Details First
    const plan = await razorpay.plans.fetch(planId);
    if (!plan || plan.item.amount === undefined) {
      throw new Error('Invalid Razorpay plan');
    }

    // 5. Create Subscription with Immediate Start
    const subscription = await razorpay.subscriptions.create({
      plan_id: planId,
      total_count: 12,
      customer_notify: 1,
      start_at: Math.floor(Date.now() / 1000) + 60, // Start in 1 minute
      notes: {
        userId: dbUser.id,
        userEmail: dbUser.email
      }
    });

    // 6. Verify Invoice Generation
    if (!subscription.first_invoice?.id) {
      throw new Error('Invoice not generated for subscription');
    }

    // 7. Create Payment Link from Invoice
    const paymentLink = await razorpay.invoices.createPaymentLink(
      subscription.first_invoice.id, 
      {
        callback_url: `${hostUrl}/payment-success?subscription_id=${subscription.id}`,
        callback_method: 'get'
      }
    );

    // 8. Update Database
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
      razorpayError: error.error?.description,
      statusCode: error.statusCode
    });
    
    return NextResponse.json({
      status: 500,
      message: error.message || 'Payment initialization failed'
    });
  }
}