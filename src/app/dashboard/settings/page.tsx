'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function EditProfilePage() {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchUser() {
      try {
        const res = await fetch(`/api/user?timestamp=${new Date().getTime()}`, { cache: 'no-store' });
        if (!res.ok) throw new Error('Failed to fetch user data');
        const data = await res.json();
        // Combine firstname and lastname into a full name
        const name = `${data.firstname || ''} ${data.lastname || ''}`.trim();
        setFullName(name);
        setEmail(data.email || '');
      } catch (err: any) {
        console.error('Error fetching user:', err);
        setError(err.message || 'Failed to fetch user data');
      } finally {
        setLoading(false);
      }
    }
    fetchUser();
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/user/update', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName }),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to update profile');
      }
      // Create URL-friendly full name: lowercase and hyphenated
      const urlName = encodeURIComponent(fullName.toLowerCase().replace(/\s+/g, '-'));
      router.push(`/dashboard/${urlName}`);
    } catch (err: any) {
      console.error('Error updating profile:', err);
      setError(err.message || 'Error updating profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center text-white text-xl">
        Loading your profile...
      </div>
    );

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-900 via-blue-900 to-bg text-white">
      <div className="w-full max-w-md p-8 bg-gray-800 rounded-2xl shadow-lg">
        <h1 className="text-4xl font-bold mb-8 text-center">Edit Profile</h1>
        {error && <div className="mb-4 text-red-500 text-center">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="mb-6">
            <label htmlFor="fullName" className="block text-lg font-medium text-blue-200 mb-2">
              Full Name
            </label>
            <input
              id="fullName"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full p-3 border border-gray-600 rounded-lg bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="mb-8">
            <label htmlFor="email" className="block text-lg font-medium text-blue-200 mb-2">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              disabled
              className="w-full p-3 border border-gray-600 rounded-lg bg-gray-600 text-gray-300 cursor-not-allowed"
            />
          </div>
          <button
            type="submit"
            disabled={saving}
            className="w-full py-3 bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </form>
      </div>
    </div>
  );
}
