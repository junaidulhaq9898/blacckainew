'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

export default function PaymentSuccessContent() {
  // Retrieve the URL search parameters and the router instance.
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState('Payment processed successfully');

  // Get the subscription ID from the URL.
  const subscription_id = searchParams.get('subscription_id');

  useEffect(() => {
    if (!subscription_id) {
      console.error('No subscription_id found in query parameters');
      router.push('/error?message=Missing%20subscription%20ID');
      return;
    }

    // Check if the subscription has been updated to PRO before redirecting
    async function checkSubscriptionStatus() {
      try {
        console.log('Checking subscription status...');
        const response = await fetch('/api/check-subscription');
        const data = await response.json();
        
        if (data.plan === 'PRO') {
          console.log('PRO plan confirmed, redirecting to dashboard');
          router.push('/dashboard');
        } else {
          console.log('Waiting for PRO status update...');
          setStatus('Payment processed. Waiting for confirmation...');
          // Try again in 2 seconds
          setTimeout(checkSubscriptionStatus, 2000);
        }
      } catch (error) {
        console.error('Error checking subscription:', error);
        setStatus('Error checking subscription status. Please contact support.');
      }
    }

    // Start checking the subscription status
    checkSubscriptionStatus();
  }, [subscription_id, router]);

  return (
    <div className="text-center p-8">
      <h1 className="text-2xl font-bold mb-4">Payment Successful</h1>
      <p className="mb-4">{status}</p>
      {subscription_id && (
        <div className="flex justify-center">
          <div className="animate-pulse h-3 w-3 bg-blue-600 rounded-full mx-1"></div>
          <div className="animate-pulse h-3 w-3 bg-blue-600 rounded-full mx-1" style={{ animationDelay: '200ms' }}></div>
          <div className="animate-pulse h-3 w-3 bg-blue-600 rounded-full mx-1" style={{ animationDelay: '400ms' }}></div>
        </div>
      )}
    </div>
  );
}