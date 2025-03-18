// src/app/payment-success/PaymentSuccessContent.tsx
'use client';

import { useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function PaymentSuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const subscriptionId = searchParams.get('subscription_id');
  const userId = searchParams.get('user_id');

  useEffect(() => {
    const verifyPayment = async () => {
      try {
        if (!subscriptionId || !userId) {
          throw new Error('Missing parameters');
        }

        const response = await fetch(
          `/api/payment/verify?subscription_id=${subscriptionId}&user_id=${userId}`
        );

        if (!response.ok) {
          throw new Error('Verification failed');
        }

        router.push(`/dashboard/${userId}`);
        router.refresh();

      } catch (error) {
        console.error('Payment verification error:', error);
        router.push('/payment-error');
      }
    };

    verifyPayment();
  }, [subscriptionId, userId, router]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4">
      <Loader2 className="h-12 w-12 animate-spin text-blue-500" />
      <h1 className="text-2xl font-semibold">Processing Payment</h1>
      <p className="text-gray-600">This will just take a moment...</p>
    </div>
  );
}