'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';

export default function SettingsPage() {
  const [subscriptionPlan, setSubscriptionPlan] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchUserSubscription() {
      try {
        // Adjust the endpoint to match your backend API
        const res = await fetch('/api/user');
        if (!res.ok) {
          throw new Error('Failed to fetch user details');
        }
        const data = await res.json();
        // Expecting data.subscriptionPlan to be "FREE" or "PRO"
        setSubscriptionPlan(data.subscriptionPlan);
      } catch (error) {
        console.error('Error fetching subscription details:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchUserSubscription();
  }, []);

  if (loading) {
    return <div>Loading settings...</div>;
  }

  return (
    <div style={{ padding: '2rem' }}>
      <h1>Account Settings</h1>
      {subscriptionPlan === 'FREE' ? (
        <div>
          <h2>Upgrade to Pro</h2>
          <p>You are currently on the Free plan. Upgrade to unlock premium features!</p>
          <Link href="/upgrade">
            <button style={{ padding: '0.75rem 1.5rem', fontSize: '1rem', cursor: 'pointer' }}>
              Upgrade Now
            </button>
          </Link>
        </div>
      ) : subscriptionPlan === 'PRO' ? (
        <div>
          <h2>Manage Subscription</h2>
          <p>As a Pro user, you can manage your payment options and subscription cycle below:</p>
          <Link href="/manage-subscription">
            <button style={{ padding: '0.75rem 1.5rem', fontSize: '1rem', cursor: 'pointer' }}>
              Manage Payment Options
            </button>
          </Link>
        </div>
      ) : (
        <div>
          <p>Unable to determine subscription status. Please contact support.</p>
        </div>
      )}
    </div>
  );
}
