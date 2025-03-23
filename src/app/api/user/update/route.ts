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

    // Update the user record using the Clerk id (assuming clerkId is the key)
    const updatedUser = await client.user.update({
      where: { clerkId: clerkUser.id },
      data: {
        firstname: body.firstname,
        lastname: body.lastname,
        // Typically, email updates might be handled by Clerk directly
      },
    });

    return NextResponse.json({ message: 'Profile updated', user: updatedUser });
  } catch (error) {
    console.error('Error updating profile:', error);
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
  }
}
