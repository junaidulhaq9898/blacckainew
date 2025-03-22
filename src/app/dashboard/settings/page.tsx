// /src/app/settings/page.tsx
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function SettingsPage() {
  const [subscriptionPlan, setSubscriptionPlan] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchUserSubscription() {
      try {
        const res = await fetch(`/api/user?timestamp=${new Date().getTime()}`, {
          cache: 'no-store',
        });
        if (!res.ok) {
          throw new Error(`Failed to fetch user details: ${res.status}`);
        }
        const data = await res.json();
        console.log('Fetched user data:', data);

        const rawPlan = data.subscriptionPlan || 'free';
        const normalizedPlan = rawPlan.trim().toLowerCase();
        console.log('Normalized subscription plan:', normalizedPlan);
        setSubscriptionPlan(normalizedPlan);
      } catch (error) {
        console.error('Error fetching subscription details:', error);
        setSubscriptionPlan('unknown');
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
      <p>
        <strong>Subscription Plan:</strong>{' '}
        {subscriptionPlan ? subscriptionPlan.charAt(0).toUpperCase() + subscriptionPlan.slice(1) : 'Unknown'}
      </p>

      {subscriptionPlan === 'free' ? (
        <div>
          <h2>Upgrade to Pro</h2>
          <p>You are currently on the Free plan. Upgrade now to unlock premium features!</p>
          <Link href="/payment">
            <button style={{ padding: '0.75rem 1.5rem', fontSize: '1rem', cursor: 'pointer' }}>
              Upgrade to Pro
            </button>
          </Link>
        </div>
      ) : subscriptionPlan === 'pro' ? (
        <div>
          <h2>Manage Your Pro Subscription</h2>
          <p>You’re on the Pro plan! Manage your payment details or subscription cycle below.</p>
          <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
            <Link href="/manage-payment">
              <button style={{ padding: '0.75rem 1.5rem', fontSize: '1rem', cursor: 'pointer' }}>
                Update Payment Method
              </button>
            </Link>
            <Link href="/manage-subscription">
              <button style={{ padding: '0.75rem 1.5rem', fontSize: '1rem', cursor: 'pointer' }}>
                Manage Subscription Cycle
              </button>
            </Link>
          </div>
        </div>
      ) : (
        <div>
          <p>Unable to determine subscription status. Please contact support.</p>
        </div>
      )}
    </div>
  );
}