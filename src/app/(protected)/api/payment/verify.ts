import { NextResponse } from 'next/server';
import { client } from '@/lib/prisma';
import { razorpay } from '@/lib/razorpay';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const subscriptionId = searchParams.get('subscription_id');
  const userId = searchParams.get('user_id');

  try {
    if (!subscriptionId || !userId) {
      return NextResponse.json({ 
        status: 400,
        message: 'Missing required parameters'
      });
    }

    // Query using individual unique fields
    const subscription = await client.subscription.findFirst({
      where: {
        AND: [
          { userId: userId },
          { customerId: subscriptionId }
        ]
      }
    });

    if (subscription?.plan === 'PRO') {
      return NextResponse.json({ 
        status: 200,
        verified: true
      });
    }

    // Rest of the verification logic remains same...
  } catch (error) {
    console.error('Verification error:', error);
    return NextResponse.json({
      status: 500,
      message: 'Payment verification failed'
    });
  }
}