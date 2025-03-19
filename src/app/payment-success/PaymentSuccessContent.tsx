'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

export default function PaymentSuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState('Payment processed successfully');
  const [attempts, setAttempts] = useState(0);

  // Get the user ID from the URL
  const userId = searchParams.get('user_id');

  useEffect(() => {
    if (!userId) {
      console.error('No user_id found in query parameters');
      router.push('/error?message=Missing%20user%20ID');
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
          // Redirect to dashboard
          router.push('/dashboard');
        } else {
          // Increment attempt counter
          setAttempts(prev => prev + 1);
          
          if (attempts < 10) {  // Try up to 10 times (20 seconds)
            console.log(`Waiting for PRO status update... (Attempt ${attempts + 1})`);
            setStatus(`Payment processed. Waiting for confirmation... (${attempts + 1}/10)`);
            // Try again in 2 seconds
            setTimeout(checkSubscriptionStatus, 2000);
          } else {
            // Fall back to redirect anyway after 10 attempts
            console.log('Maximum attempts reached, redirecting to dashboard anyway');
            setStatus('Redirecting to dashboard...');
            router.push('/dashboard');
          }
        }
      } catch (error) {
        console.error('Error checking subscription:', error);
        setStatus('Error checking subscription status. Redirecting to dashboard anyway...');
        // On error, redirect to dashboard after a short delay
        setTimeout(() => router.push('/dashboard'), 2000);
      }
    }

    // Start checking the subscription status
    checkSubscriptionStatus();
  }, [userId, router, attempts]);

  return (
    <div className="text-center p-8">
      <h1 className="text-2xl font-bold mb-4">Payment Successful</h1>
      <p className="mb-4">{status}</p>
      {userId && (
        <div className="flex justify-center">
          <div className="animate-pulse h-3 w-3 bg-blue-600 rounded-full mx-1"></div>
          <div className="animate-pulse h-3 w-3 bg-blue-600 rounded-full mx-1" style={{ animationDelay: '200ms' }}></div>
          <div className="animate-pulse h-3 w-3 bg-blue-600 rounded-full mx-1" style={{ animationDelay: '400ms' }}></div>
        </div>
      )}
    </div>
  );
}