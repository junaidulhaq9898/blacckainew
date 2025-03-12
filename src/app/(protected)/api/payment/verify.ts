import { NextResponse } from 'next/server';
import { razorpay } from '@/lib/razorpay';
import { client } from '@/lib/prisma';

// UUID validation regex
const isValidUUID = (id: string) => 
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(id);

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const subscriptionId = searchParams.get('subscription_id');
    
    // Validate subscription ID exists
    if (!subscriptionId) {
      return NextResponse.json(
        { success: false, error: 'Missing subscription ID' },
        { status: 400 }
      );
    }

    // Fetch subscription details
    const subscription = await razorpay.subscriptions.fetch(subscriptionId);
    
    // Validate subscription notes and user ID
    if (!subscription.notes?.userId) {
      return NextResponse.json(
        { success: false, error: 'Invalid subscription data' },
        { status: 400 }
      );
    }

    // Convert and validate user ID format
    const userId = String(subscription.notes.userId);
    if (!isValidUUID(userId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid user ID format' },
        { status: 400 }
      );
    }

    // Update subscription plan
    await client.subscription.upsert({
      where: { userId },
      update: { plan: 'PRO' },
      create: {
        userId,
        plan: 'PRO'
      },
    });

    return NextResponse.json({
      success: true,
      plan: 'PRO'
    });

  } catch (error: any) {
    console.error('Verification error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error?.message || 'Payment verification failed',
        plan: 'FREE'
      },
      { status: 500 }
    );
  }
}