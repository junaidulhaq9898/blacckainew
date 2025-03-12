import { NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { client } from '@/lib/prisma';
import { razorpay } from '@/lib/razorpay';

export async function POST() {
  try {
    const clerkUser = await currentUser();
    if (!clerkUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const dbUser = await client.user.findUnique({
      where: { clerkId: clerkUser.id }
    });

    if (!dbUser) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const subscription = await razorpay.subscriptions.create({
      plan_id: process.env.RAZORPAY_PLAN_ID!,
      total_count: 12,
      notes: { userId: dbUser.id }
    });

    const paymentLink = await razorpay.paymentLink.create({
      amount: 49900,
      currency: 'INR',
      description: 'PRO Plan',
      subscription_id: subscription.id,
      callback_url: `${process.env.NEXT_PUBLIC_HOST_URL}/payment-success`
    } as any);

    return NextResponse.json({
      url: (paymentLink as any).short_url
    });

  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Payment failed' },
      { status: 500 }
    );
  }
}