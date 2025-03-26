'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function SettingsPage() {
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchUser() {
      try {
        // Fetch with no-store and timestamp to avoid caching issues
        const res = await fetch('/api/user?timestamp=' + new Date().getTime(), { cache: 'no-store' });
        if (!res.ok) throw new Error('API error');
        const data = await res.json();
        console.log('Fetched user data:', data);
        // Normalize the subscription plan (if provided)
        if (data.subscriptionPlan) {
          data.subscriptionPlan = data.subscriptionPlan.trim().toLowerCase();
        }
        setUserData(data);
      } catch (error) {
        console.error('Error fetching user data:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchUser();
  }, []);

  if (loading) return <div>Loading your account settings...</div>;

  return (
    <section className="relative bg-gradient-to-b from-slate-900 via-blue-900 to-bg min-h-screen">
      {/* Background Grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_110%)]" />
      
      <div className="relative container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold text-white mb-8">Account Settings</h1>
        
        {/* Profile Section */}
        <div className="bg-white/10 rounded-2xl p-8 border border-white/20 mb-8">
          <h2 className="text-2xl font-semibold text-white">Profile Information</h2>
          <p className="mt-4 text-blue-200"><strong>Name:</strong> {userData.firstname} {userData.lastname || ''}</p>
          <p className="mt-2 text-blue-200"><strong>Email:</strong> {userData.email}</p>
          <div className="mt-4">
            <Link href="/profile/edit">
              <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg">
                Edit Name
              </button>
            </Link>
          </div>
        </div>
        
        {/* Subscription Section */}
        <div className="bg-white/10 rounded-2xl p-8 border border-white/20 mb-8">
          <h2 className="text-2xl font-semibold text-white">Subscription Plan</h2>
          {userData.subscriptionPlan === 'pro' ? (
            <div className="mt-4 text-blue-200">
              <p className="font-bold">You are on the Pro Plan</p>
              <ul className="list-disc ml-6 mt-2">
                <li>Smart AI - $99/month</li>
                <li>All Free Plan features</li>
                <li>AI-powered response generation</li>
                <li>Advanced analytics and insights</li>
                <li>Priority customer support</li>
                <li>Custom branding options</li>
              </ul>
             
            </div>
          ) : (
            <div className="mt-4 text-blue-200">
              <p className="font-bold">You are on the Free Plan</p>
              <p className="mt-2">Upgrade to Pro to unlock premium features and enhanced support.</p>
              <div className="mt-4">
                <Link href="/upgrade">
                  <button className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg">
                    Upgrade to Pro
                  </button>
                </Link>
              </div>
            </div>
          )}
        </div>
        
        
      </div>
    </section>
  );
}
