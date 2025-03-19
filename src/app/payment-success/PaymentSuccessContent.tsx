'use client';

import { useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

export default function PaymentSuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const subscriptionId = searchParams.get('subscription_id');
    const userId = searchParams.get('user_id');

    // Direct redirect with fallback
    if (userId) {
      router.push(`/dashboard/${userId}`);
    } else {
      router.push('/dashboard');
    }
    
    // Force refresh after 1 second
    setTimeout(() => window.location.reload(), 1000);

  }, [router, searchParams]);

  return null; // Silent redirect
}