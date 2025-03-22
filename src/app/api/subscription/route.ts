// /api/subscription/route.ts
import { NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { client } from '@/lib/prisma';

export async function GET() {
  const clerkUser = await currentUser();
  if (!clerkUser) {
    return NextResponse.json({ status: 401, message: 'Unauthorized' });
  }

  const subscription = await client.subscription.findUnique({
    where: { userId: clerkUser.id },
    select: { customerId: true, plan: true },
  });

  return NextResponse.json({
    customerId: subscription?.customerId,
    plan: subscription?.plan,
  });
}