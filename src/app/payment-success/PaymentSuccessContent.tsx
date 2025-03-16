'use client';
import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useRouter } from 'next/navigation';

export default function PaymentSuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const subscription_id = searchParams.get('subscription_id');

  useEffect(() => {
    if (subscription_id) {
      console.log('Redirecting to dashboard with subscription_id:', subscription_id);
      // Delay redirection by 2 seconds to show the success message
      const timer = setTimeout(() => {
        router.push('/dashboard');
      }, 2000);
      // Cleanup the timer if the component unmounts
      return () => clearTimeout(timer);
    } else {
      console.error('No subscription_id found in query parameters');
      // Redirect to an error page with a message
      router.push('/error?message=Missing%20subscription%20ID');
    }
  }, [subscription_id, router]);

  return (
    <div>
      <h1>Payment Successful</h1>
      {subscription_id ? (
        <p>Redirecting to dashboard in a few seconds...</p>
      ) : (
        <p>Error: Missing subscription ID. Please contact support.</p>
      )}
    </div>
  );
}