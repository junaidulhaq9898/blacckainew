import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function PaymentSuccess() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to the dashboard with the payment success status
    router.replace('/dashboard?status=payment_success');
  }, [router]);

  return <div>Redirecting to dashboard...</div>;
}
