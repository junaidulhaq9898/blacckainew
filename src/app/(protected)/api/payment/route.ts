import { NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { client } from '@/lib/prisma';
import { razorpay } from '@/lib/razorpay';

// Helper function to normalize errors
function normalizeError(error: unknown): Error {
  if (error instanceof Error) return error;
  if (typeof error === 'string') return new Error(error);
  return new Error('Unknown error occurred');
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

    console.log('Database user lookup result:', dbUser); // Debug log

    if (!dbUser) {
      return NextResponse.json({ 
        status: 404, 
        message: 'User profile not found' 
      });
    }

    // 3. Environment Validation
    const planId = process.env.RAZORPAY_PLAN_ID;
    const hostUrl = process.env.NEXT_PUBLIC_HOST_URL;
    
    console.log('Environment variables:', { planId, hostUrl }); // Debug log

    if (!planId || !hostUrl) {
      throw new Error(`Missing configuration: 
        ${!planId ? 'RAZORPAY_PLAN_ID ' : ''}
        ${!hostUrl ? 'NEXT_PUBLIC_HOST_URL' : ''}
      `);
    }

    // 4. Razorpay Subscription
    console.log('Creating Razorpay subscription...');
    const subscription = await razorpay.subscriptions.create({
      plan_id: planId,
      total_count: 12,
      customer_notify: 1,
      notes: {
        userId: dbUser.id,
        userEmail: dbUser.email
      },
      start_at: Math.floor(Date.now() / 1000),
    });

    console.log('Subscription created:', JSON.stringify(subscription, null, 2));

    // 5. Invoice Validation
    if (!subscription.first_invoice?.id) {
      throw new Error(`Invoice not generated. Subscription status: ${subscription.status}`);
    }

    // 6. Payment Link Creation
    console.log('Creating payment link...');
    const paymentLink = await razorpay.paymentLink.create({
      invoice_id: subscription.first_invoice.id,
      callback_url: `${hostUrl}/payment-success?subscription_id=${subscription.id}`,
      callback_method: 'get',
    });

    console.log('Payment link created:', paymentLink.short_url);

    // 7. Database Update
    console.log('Updating database subscription...');
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

  } catch (rawError) {
    const error = normalizeError(rawError);
    
    console.error('Full Payment Error:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
      rawError: JSON.stringify(rawError, Object.getOwnPropertyNames(rawError))
    });

    return NextResponse.json({
      status: 500,
      message: error.message
    });
  }
}