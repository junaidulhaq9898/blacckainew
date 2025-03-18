// src/app/api/payment/verify/route.ts
import { NextResponse } from 'next/server';
import { client } from '@/lib/prisma';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const subscriptionId = searchParams.get('subscription_id');
  const userId = searchParams.get('user_id');

  try {
    if (!subscriptionId || !userId) {
      return NextResponse.json({ status: 400, message: 'Missing parameters' });
    }

    const subscription = await client.subscription.findFirst({
      where: {
        AND: [
          { customerId: subscriptionId },
          { userId: userId }
        ]
      }
    });

    return NextResponse.json({
      status: 200,
      verified: subscription?.plan === 'PRO'
    });

  } catch (error) {
    console.error('Verification error:', error);
    return NextResponse.json({ status: 500, message: 'Verification failed' });
  }
}