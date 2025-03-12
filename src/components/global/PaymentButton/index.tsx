'use client';

import { useState } from 'react';

const PaymentButton = () => {
  const [loading, setLoading] = useState(false);

  const handlePayment = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/(protected)/payment', { method: 'POST' });
      const data = await res.json();

      if (!res.ok) throw new Error(data.message || 'Payment failed');
      window.location.href = data.url;
    } catch (error) {
      console.error('Payment error:', error);
      alert(error instanceof Error ? error.message : 'Payment failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button 
      onClick={handlePayment} 
      disabled={loading}
      className="bg-blue-600 text-white px-6 py-2 rounded-lg disabled:opacity-50"
    >
      {loading ? 'Processing...' : 'Upgrade to PRO'}
    </button>
  );
};

export default PaymentButton;