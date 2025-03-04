import { NextResponse } from 'next/server';
import Razorpay from 'razorpay';
import { currentUser } from '@clerk/nextjs/server';

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

export async function POST() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ status: 404 });

  const amount = 499; // Amount in INR cents (e.g., ₹4.99)

  try {
    const order = await razorpay.orders.create({
      amount,
      currency: 'INR',
      receipt: `receipt_order_${new Date().getTime()}`,
    });

    return NextResponse.json({
      status: 200,
      order,
    });
  } catch (error) {
    console.error('Razorpay Order Creation Error:', error);
    return NextResponse.json({ status: 500, error: 'Order creation failed' });
  }
}
