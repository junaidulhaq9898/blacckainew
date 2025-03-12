'use client';
import { Suspense, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';

function PaymentSuccessContent() {
  const router = useRouter();
  const params = useSearchParams();

  useEffect(() => {
    const verifyPayment = async () => {
      const subscriptionId = params.get('subscription_id');
      if (!subscriptionId) return router.push('/dashboard');

      try {
        const res = await fetch(`/api/(protected)/payment/verify?subscription_id=${subscriptionId}`);
        const data = await res.json();
        
        if (data.success) {
          toast.success('PRO plan activated!');
        } else {
          toast.error(data.error || 'Payment failed');
        }
      } catch (error) {
        toast.error('Verification failed');
      }
      router.push('/dashboard');
    };

    verifyPayment();
  }, [router, params]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <h1 className="text-2xl font-bold">Processing payment...</h1>
    </div>
  );
}

export default function PaymentSuccess() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <PaymentSuccessContent />
    </Suspense>
  );
}