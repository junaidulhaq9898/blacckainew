// src/app/payment-success/page.tsx
import { redirect } from 'next/navigation';
import { currentUser } from '@clerk/nextjs/server';
import { client } from '@/lib/prisma';
import { razorpay } from '@/lib/razorpay';

type Props = {
  searchParams: {
    subscription_id?: string;
    payment_id?: string;
  }
}

export default async function PaymentSuccessPage({ 
  searchParams: { 
    subscription_id, 
    payment_id 
  } 
}: Props) {
  // Redirect if no subscription_id is provided
  if (!subscription_id) {
    console.error('No subscription_id in URL parameters');
    return redirect('/dashboard?error=missing_subscription');
  }

  try {
    // Get current user
    const user = await currentUser();
    if (!user) {
      console.error('No authenticated user found');
      return redirect('/sign-in');
    }

    // Get database user
    const dbUser = await client.user.findUnique({
      where: { clerkId: user.id },
      include: { subscription: true }
    });

    if (!dbUser) {
      console.error('User not found in database');
      return redirect('/dashboard?error=user_not_found');
    }

    // Fetch subscription from Razorpay to verify
    const subscription = await razorpay.subscriptions.fetch(subscription_id);
    
    // Manual verification as a backup for webhook
    if (subscription.status === 'active') {
      // Update or create subscription
      if (dbUser.subscription) {
        await client.subscription.update({
          where: { id: dbUser.subscription.id },
          data: {
            plan: 'PRO',
            customerId: subscription_id,
            updatedAt: new Date()
          }
        });
      } else {
        await client.subscription.create({
          data: {
            userId: dbUser.id,
            plan: 'PRO',
            customerId: subscription_id
          }
        });
      }
      
      console.log('Subscription manually updated for user:', dbUser.id);
    }

    // Redirect to dashboard with success message
    return redirect('/dashboard?status=payment_success');
  } catch (error) {
    console.error('Error in payment success page:', error);
    return redirect('/dashboard?error=payment_processing');
  }
}