// components/PaymentButton.tsx
'use client';

import { useState, ReactNode } from 'react';
import { cn } from '@/lib/utils'; // Ensure you have this utility

interface PaymentButtonProps {
  className?: string;
  children: ReactNode;
  loadingComponent?: ReactNode;
}

export default function PaymentButton({
  className,
  children,
  loadingComponent = 'Processing...'
}: PaymentButtonProps) {
  const [loading, setLoading] = useState(false);

  const handlePayment = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/(protected)/payment', { method: 'POST' });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Payment initiation failed');
      }

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
      className={cn(
        'bg-blue-600 text-white px-6 py-2 rounded-lg',
        'hover:bg-blue-700 transition-colors',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        className
      )}
    >
      {loading ? loadingComponent : children}
    </button>
  );
}