'use client';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useRouter } from 'next/navigation';

export default function PaymentSuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const subscription_id = searchParams.get('subscription_id');
  const [countdown, setCountdown] = useState(3); // Start with a 3-second countdown

  useEffect(() => {
    if (subscription_id) {
      console.log('Redirecting to dashboard with subscription_id:', subscription_id);
      // Update countdown every second
      const interval = setInterval(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
      // Redirect after 3 seconds
      const timer = setTimeout(() => {
        router.push('/dashboard');
      }, 3000);
      // Cleanup on unmount
      return () => {
        clearInterval(interval);
        clearTimeout(timer);
      };
    } else {
      console.error('No subscription_id found in query parameters');
      router.push('/error?message=Missing%20subscription%20ID');
    }
  }, [subscription_id, router]);

  return (
    <div>
      <h1>Payment Successful</h1>
      {subscription_id ? (
        <p>Redirecting to dashboard in {countdown} seconds...</p>
      ) : (
        <p>
          Error: Missing subscription ID. Please try again or contact{' '}
          <a href="mailto:support@example.com">support@example.com</a>.
        </p>
      )}
    </div>
  );
}