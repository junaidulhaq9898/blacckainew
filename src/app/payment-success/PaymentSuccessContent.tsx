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
        if (!subscriptionId || !userId) throw new Error('Missing parameters');
        
        const response = await fetch(
          `/api/payment/verify?subscription_id=${subscriptionId}&user_id=${userId}`
        );
        
        if (!response.ok) throw new Error('Verification failed');
        
        const data = await response.json();
        if (data.verified) {
          router.push(`/dashboard/${userId}`);
          router.refresh();
        } else {
          throw new Error('Payment not verified');
        }
      } catch (error) {
        console.error(error);
        setStatus('error');
      }
    };

    verifyPayment();
  }, [subscriptionId, userId, router]);

  if (status === 'error') {
    return (
      <div className="max-w-md mx-auto mt-20 text-center">
        <h1 className="text-2xl font-bold text-red-600 mb-4">Payment Failed</h1>
        <p className="text-gray-600">
          Please check your subscription status or contact support.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto mt-20 text-center">
      <Loader2 className="w-12 h-12 mx-auto animate-spin text-blue-600" />
      <h1 className="mt-4 text-xl font-semibold text-gray-900">Processing Payment</h1>
      <p className="mt-2 text-gray-600">This may take a few moments...</p>
    </div>
  );
}