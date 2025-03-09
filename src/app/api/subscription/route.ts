import { NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { client } from '@/lib/prisma';

export async function GET() {
  const clerkUser = await currentUser();
  if (!clerkUser) {
    return NextResponse.json({ status: 401, message: 'Unauthorized' });
  }

  const dbUser = await client.user.findUnique({
    where: { clerkId: clerkUser.id },
    include: { subscription: true },
  });

  return NextResponse.json(dbUser?.subscription || { plan: 'FREE' });
}