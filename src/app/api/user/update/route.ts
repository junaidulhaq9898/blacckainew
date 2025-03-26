import { NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { client } from '@/lib/prisma';

export async function PUT(request: Request) {
  try {
    const clerkUser = await currentUser();
    if (!clerkUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const body = await request.json();
    const fullName = body.fullName || '';
    const parts = fullName.trim().split(' ');
    const firstname = parts[0] || '';
    const lastname = parts.slice(1).join(' ') || '';
    const updatedUser = await client.user.update({
      where: { clerkId: clerkUser.id },
      data: { firstname, lastname },
    });
    return NextResponse.json({ message: 'Profile updated', user: updatedUser });
  } catch (error: any) {
    console.error('Error updating profile:', error);
    return NextResponse.json({ error: error.message || 'Failed to update profile' }, { status: 500 });
  }
}
