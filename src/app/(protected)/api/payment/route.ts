import { razorpay } from '@/lib/razorpay';
import { currentUser } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ status: 404, message: 'User not found' });

  const planId = process.env.RAZORPAY_PLAN_ID;
  if (!planId) {
    console.error('RAZORPAY_PLAN_ID is not set');
    return NextResponse.json({ status: 500, message: 'Server configuration error' });
  }

  const subscription: any = await razorpay.subscriptions.create({
    plan_id: planId,
    customer_notify: 1,
    total_count: 12,
    notes: { userId: user.id },
  });

  if (subscription) {
    return NextResponse.json({
      status: 200,
      session_url: subscription.short_url,
    });
  }
  return NextResponse.json({ status: 400, message: 'Failed to create subscription' });
}