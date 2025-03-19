'use client';

import { useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

export default function PaymentSuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const userId = searchParams.get('user_id'); // Use snake_case
    
    if (userId) {
      // Immediate redirect with user ID
      window.location.href = `/dashboard/${userId}?payment=success`;
    } else {
      // Fallback to generic dashboard
      window.location.href = '/dashboard?payment=error';
    }
  }, [router, searchParams]);

  return null; // No rendering needed
}