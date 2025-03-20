import { NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { client } from '@/lib/prisma';
import { razorpay } from '@/lib/razorpay';

interface RazorpayError extends Error {
  statusCode?: number;
  error?: {
    code: string;
    description: string;
  };
}

export async function POST() {
  try {
    // 1. Authentication
    const clerkUser = await currentUser();
    if (!clerkUser) {
      return NextResponse.json({ 
        status: 401, 
        message: 'Authentication required' 
      });
    }

    // 2. Database Lookup
    const dbUser = await client.user.findUnique({
      where: { clerkId: clerkUser.id },
      select: { id: true, email: true, firstname: true }
    });

    if (!dbUser) {
      return NextResponse.json({ 
        status: 404, 
        message: 'User profile not found' 
      });
    }

    // 3. Environment Validation
    const planId = process.env.RAZORPAY_PLAN_ID;
    const hostUrl = process.env.NEXT_PUBLIC_HOST_URL;
    
    if (!planId || !hostUrl) {
      throw new Error(`Missing configuration: 
        ${!planId ? 'RAZORPAY_PLAN_ID ' : ''}
        ${!hostUrl ? 'NEXT_PUBLIC_HOST_URL' : ''}
      `);
    }

    // 4. Create Razorpay Subscription
    const startAt = Math.floor(Date.now() / 1000) + 300; // 5-minute buffer
    const subscriptionParams = {
      plan_id: planId,
      total_count: 12,
      customer_notify: 1,
      start_at: startAt,
      notes: {
        userId: dbUser.id,
        userEmail: dbUser.email
      }
    };

    console.log('Subscription creation parameters:', subscriptionParams);

    const subscription = await razorpay.subscriptions.create(subscriptionParams)
      .catch(async (error: RazorpayError) => {
        console.error('Razorpay API Error:', {
          status: error.statusCode,
          code: error.error?.code,
          description: error.error?.description
        });
        throw new Error(`Razorpay Error: ${error.error?.description || 'Subscription creation failed'}`);
      });

    console.log('Subscription created:', JSON.stringify(subscription, null, 2));

    // 5. Validate Invoice Generation
    if (!subscription.first_invoice?.id) {
      throw new Error(`Invoice generation failed. Current status: ${subscription.status}`);
    }

    // 6. Create Payment Link
    const paymentLink = await razorpay.paymentLink.create({
      invoice_id: subscription.first_invoice.id,
      callback_url: `${hostUrl}/payment-success?subscription_id=${subscription.id}`,
      callback_method: 'get',
    }).catch((error: any) => {
      console.error('Payment Link Error:', error);
      throw new Error('Failed to create payment link');
    });

    // 7. Update Database
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

  } catch (error: unknown) {
    console.error('Full Error Details:', JSON.stringify(error, null, 2));
    
    const errorMessage = error instanceof Error 
      ? error.message 
      : 'Unknown error occurred';

    return NextResponse.json({
      status: 500,
      message: errorMessage
    });
  }
}