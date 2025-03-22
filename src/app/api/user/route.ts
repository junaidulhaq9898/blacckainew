// /src/app/api/user/route.ts
import { NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { client } from '@/lib/prisma';

export async function GET() {
  try {
    const clerkUser = await currentUser();
    if (!clerkUser) {
      return NextResponse.json({ status: 401, message: 'Unauthorized' });
    }

    const dbUser = await client.user.findUnique({
      where: { clerkId: clerkUser.id },
      select: {
        id: true,
        email: true,
        firstname: true,
        subscription: {
          select: {
            plan: true,
          },
        },
      },
    });

    if (!dbUser) {
      return NextResponse.json({ status: 404, message: 'User not found' });
    }

    const subscriptionPlan = dbUser.subscription?.plan || 'FREE';
    return NextResponse.json({
      status: 200,
      subscriptionPlan,
      email: dbUser.email,
      firstname: dbUser.firstname,
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    return NextResponse.json({ status: 500, message: 'Failed to fetch user details' });
  }
}