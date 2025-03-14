'use client';

import { useUser } from '@clerk/nextjs';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function PaymentSuccess() {
  const { user } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (user) {
      const username = user.firstName || user.id; // Use firstName, fallback to id
      if (!username) {
        console.error('No valid username or ID found for user:', user);
        router.replace('/dashboard/default?status=error');
        return;
      }
      router.replace(`/dashboard/${username}?status=payment_success`);
    }
  }, [user, router]);

  return <div>Processing payment confirmation...</div>;
}