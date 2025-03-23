// src/app/api/user/route.ts
import { NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { client } from '@/lib/prisma';

export async function GET() {
  try {
    const clerkUser = await currentUser();
    if (!clerkUser) {
      console.error('No Clerk user found');
      return NextResponse.json({ status: 401, message: 'Unauthorized' });
    }
    console.log('Authenticated Clerk user id:', clerkUser.id);

    const dbUser = await client.user.findUnique({
      where: { clerkId: clerkUser.id },
      include: { subscription: true },
    });

    if (!dbUser) {
      console.error('No user found in DB for Clerk id:', clerkUser.id);
      return NextResponse.json({ status: 404, message: 'User not found' });
    }

    console.log('DB user fetched:', dbUser);
    console.log('DB subscription:', dbUser.subscription);

    // Use the subscription plan from DB or default to "FREE"
    const subscriptionPlan = dbUser.subscription?.plan || 'FREE';

    return NextResponse.json({
      subscriptionPlan,
      email: dbUser.email,
      firstname: dbUser.firstname,
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    return NextResponse.json({ status: 500, message: 'Failed to fetch user details' });
  }
}
