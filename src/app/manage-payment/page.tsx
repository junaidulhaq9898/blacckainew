// /src/app/manage-payment/page.tsx
"use client";

import { useEffect, useState } from 'react';
import { useUser } from '@clerk/nextjs';

export default function ManagePaymentPage() {
  const { user } = useUser();
  const [loading, setLoading] = useState(true);
  const [customerId, setCustomerId] = useState<string | null>(null);

  useEffect(() => {
    async function fetchCustomerId() {
      try {
        const res = await fetch('/api/subscription');
        const data = await res.json();
        setCustomerId(data.customerId); // Assumes customerId from Subscription model
      } catch (error) {
        console.error('Error fetching subscription:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchCustomerId();
  }, []);

  const handleUpdatePayment = () => {
    // Placeholder for Razorpay integration
    alert('This feature would open a Razorpay portal to update your card details.');
    // Example: window.location.href = 'https://razorpay.com/update-payment';
  };

  if (loading) return <div>Loading...</div>;
  if (!customerId) return <div>No active subscription found.</div>;

  return (
    <div style={{ padding: '2rem' }}>
      <h1>Update Payment Method</h1>
      <p>Update your card details for subscription payments.</p>
      <button
        onClick={handleUpdatePayment}
        style={{ padding: '0.75rem 1.5rem', fontSize: '1rem', cursor: 'pointer' }}
      >
        Update Card
      </button>
    </div>
  );
}