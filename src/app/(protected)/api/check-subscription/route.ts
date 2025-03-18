// app/api/check-subscription/route.ts
import { NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { client } from '@/lib/prisma';

export async function GET() {
  try {
    // 1. Authenticate user via Clerk
    const clerkUser = await currentUser();
    if (!clerkUser) {
      return NextResponse.json({ status: 401, message: 'Unauthorized' });
    }

    // 2. Retrieve user with subscription from database
    const dbUser = await client.user.findUnique({
      where: { clerkId: clerkUser.id },
      include: { subscription: true }
    });
    
    if (!dbUser) {
      return NextResponse.json({ status: 404, message: 'User not found' });
    }

    // 3. Return subscription plan status
    return NextResponse.json({
      status: 200,
      plan: dbUser.subscription?.plan || 'FREE'
    });
  } catch (error: any) {
    console.error('Error checking subscription:', error.message);
    return NextResponse.json({
      status: 500,
      message: error.message || 'Failed to check subscription'
    });
  }
}