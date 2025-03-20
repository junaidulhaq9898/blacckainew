'use client';

import { redirect } from 'next/navigation';
import { useSearchParams } from 'next/navigation';
import { useEffect } from 'react';

export default function PaymentPage() {
  const searchParams = useSearchParams();
  const subscription_id = searchParams.get('subscription_id');

  useEffect(() => {
    if (subscription_id) {
      redirect('/dashboard');
    }
  }, [subscription_id]);

  return (
    <div>
      <h1>Processing Payment...</h1>
    </div>
  );
}
