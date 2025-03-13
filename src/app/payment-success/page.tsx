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
      // Fetch username from Clerk's user object (adjust based on your setup)
      const username = user.username;
      if (username) {
        // Redirect to dashboard with username in URL path
        router.replace(`/dashboard/${username}?status=payment_success`);
      } else {
        console.error('Username not found');
        // Fallback redirect without username (if username is unavailable)
        router.replace('/dashboard?status=payment_success');
      }
    }
  }, [user, router]);

  return <div>Redirecting to dashboard...</div>;
}