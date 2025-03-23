"use client";

import { useEffect, useState } from 'react';
import { useUser } from '@clerk/nextjs';

export default function ManageSubscriptionCycle() {
  const { user } = useUser();
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState<any>(null);

  useEffect(() => {
    async function fetchSubscription() {
      try {
        const res = await fetch('/api/subscription');
        const data = await res.json();
        setSubscription(data);
      } catch (error) {
        console.error('Error fetching subscription:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchSubscription();
  }, []);

  const handleChangeCycle = () => {
    alert('This would allow changing your billing cycle (e.g., monthly to yearly).');
  };

  if (loading) return <div>Loading...</div>;
  if (!subscription || subscription.plan !== 'PRO') return <div>No Pro subscription found.</div>;

  return (
    <div style={{ padding: '2rem' }}>
      <h1>Manage Subscription Cycle</h1>
      <p>Current Plan: Pro</p>
      <p>Manage your billing cycle below.</p>
      <button onClick={handleChangeCycle} style={{ padding: '0.75rem 1.5rem', cursor: 'pointer' }}>
        Change Billing Cycle
      </button>
    </div>
  );
}