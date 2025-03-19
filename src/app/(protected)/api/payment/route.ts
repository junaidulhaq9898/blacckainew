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

    // 3. Create a direct payment link (without subscription first)
    const paymentLink = await razorpay.paymentLink.create({
      amount: 400, // Amount in paise (₹4.00) - Make sure this matches your plan amount
      currency: 'INR',
      description: 'Upgrade to PRO Plan',
      customer: {
        email: dbUser.email,
        name: dbUser.firstname || 'User'
      },
      callback_url: `${process.env.NEXT_PUBLIC_HOST_URL}/payment-success?user_id=${dbUser.id}`,
      callback_method: 'get',
      notes: {
        userId: dbUser.id
      }
    });
    
    console.log('Payment link created:', paymentLink.short_url);

    // 4. Store a temporary subscription record
    await client.subscription.upsert({
      where: { userId: dbUser.id },
      update: { customerId: paymentLink.id },
      create: {
        userId: dbUser.id,
        customerId: paymentLink.id,
        plan: 'FREE' // Will be updated to 'PRO' via webhook after payment
      }
    });

    return NextResponse.json({
      status: 200,
      session_url: paymentLink.short_url,
    });
  } catch (error: any) {
    console.error('Payment error:', error.message, error.stack);
    return NextResponse.json({
      status: 500,
      message: error.message || 'Failed to initiate payment'
    });
  }
}