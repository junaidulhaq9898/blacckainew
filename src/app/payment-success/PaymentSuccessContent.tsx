'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';

export default function PaymentSuccessPage() {
  const searchParams = useSearchParams();

  useEffect(() => {
    const userId = searchParams.get('user_id');
    const redirectUrl = userId 
      ? `/dashboard/${userId}?payment=success`
      : '/dashboard?payment=error';

    // Hard redirect with full page reload
    window.location.href = redirectUrl;
  }, []);

  return null;
}
