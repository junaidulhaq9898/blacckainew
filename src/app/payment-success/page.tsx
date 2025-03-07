// app/payment-success/page.tsx
'use client';
import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useRouter } from 'next/navigation';

export default function PaymentSuccessPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const subscription_id = searchParams.get('subscription_id');

  useEffect(() => {
    if (subscription_id) {
      console.log('Redirecting to dashboard with subscription_id:', subscription_id);
      router.push('/dashboard');
    } else {
      console.error('No subscription_id found in query parameters');
    }
  }, [subscription_id, router]);

  return (
    <div>
      <h1>Payment Successful</h1>
      <p>Redirecting to dashboard...</p>
    </div>
  );
}