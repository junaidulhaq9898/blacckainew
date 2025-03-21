'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

export default function PaymentSuccessPage() {
  const searchParams = useSearchParams();
  // If your subscription.short_url isn’t appending any query parameter,
  // you might need to default the user_id or use a different mechanism.
  const userId = searchParams.get('user_id') || 'defaultUser';

  // Build the dashboard URL using the user_id from the query parameter.
  const redirectUrl = `/dashboard/${userId}?payment=success`;

  return (
    <div style={{ padding: '2rem', textAlign: 'center' }}>
      <h1>Payment Successful</h1>
      <p>Your payment was processed successfully.</p>
      <p>Please click the button below to return to your dashboard.</p>
      <Link href={redirectUrl}>
        <button style={{ padding: '1rem 2rem', fontSize: '1rem', cursor: 'pointer' }}>
          Return to Dashboard
        </button>
      </Link>
    </div>
  );
}
