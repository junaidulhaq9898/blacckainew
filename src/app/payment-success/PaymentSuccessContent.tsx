'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function PaymentSuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');

  const subscriptionId = searchParams.get('subscription_id');
  const userId = searchParams.get('user_id');

  useEffect(() => {
    const verifyPayment = async () => {
      try {
        if (!subscriptionId || !userId) {
          router.push('/dashboard');
          return;
        }

        // From old code's verification approach
        const response = await fetch(
          `/api/payment/verify?subscription_id=${subscriptionId}&user_id=${userId}`
        );

        if (response.ok) {
          router.push(`/dashboard/${userId}`);
          router.refresh();
        } else {
          throw new Error('Verification failed');
        }
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