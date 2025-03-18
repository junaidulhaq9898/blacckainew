'use client';

import { useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

export default function PaymentSuccessContent() {
  // Retrieve the URL search parameters and the router instance.
  const searchParams = useSearchParams();
  const router = useRouter();

  // Get the subscription ID from the URL.
  const subscription_id = searchParams.get('subscription_id');

  useEffect(() => {
    if (subscription_id) {
      console.log('Redirecting to dashboard with subscription_id:', subscription_id);
      // Delay redirection by 2 seconds so the user can see the success message.
      const timer = setTimeout(() => {
        router.push('/dashboard');
      }, 2000);
      // Cleanup timer on component unmount.
      return () => clearTimeout(timer);
    } else {
      console.error('No subscription_id found in query parameters');
      // If subscription_id is missing, redirect to an error page.
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
