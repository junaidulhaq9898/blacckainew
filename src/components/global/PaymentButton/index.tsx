// components/PaymentButton.tsx
'use client';

import { useState } from 'react';

export default function PaymentButton() {
  const [loading, setLoading] = useState(false);

  const handlePayment = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/payment', { method: 'POST' });
      const data = await res.json();

      if (res.status !== 200) {
        console.error('Payment initiation failed:', data.message);
        alert('Failed to start payment. Please try again.');
        return;
      }

      // Redirect to Razorpay checkout page
      window.location.href = data.session_url;
    } catch (error) {
      console.error('Payment error:', error);
      alert('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button onClick={handlePayment} disabled={loading}>
      {loading ? 'Processing...' : 'Upgrade to PRO'}
    </button>
  );
}