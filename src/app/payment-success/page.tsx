// src/app/payment-success/page.tsx
'use client';

import { useUser } from '@clerk/nextjs';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function PaymentSuccess() {
  const { user } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (user) {
      // Fetch the username from Clerk's user object
      // Adjust this if your username is stored in a different field (e.g., user.firstName)
      const username = user.username;
      if (username) {
        // Redirect to the dashboard with the username and payment success status
        router.replace(`/dashboard/${username}?status=payment_success`);
      } else {
        console.error('Username not found');
        // Fallback redirect if username is unavailable
        router.replace('/dashboard?status=payment_success');
      }
    }
  }, [user, router]);

  return <div>Redirecting to dashboard...</div>;
}