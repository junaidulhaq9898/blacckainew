// /Users/junaid/Desktop/slide-webprodigies/src/app/payment/page.tsx
"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';

declare global {
  interface Window {
    Razorpay: any; // Type declaration for Razorpay
  }
}

export default function PaymentPage() {
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const [scriptLoaded, setScriptLoaded] = useState(false);

  // Load Razorpay script dynamically
  useEffect(() => {
    const loadScript = () => {
      if (window.Razorpay) {
        setScriptLoaded(true);
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => setScriptLoaded(true);
      document.body.appendChild(script);
    };
    loadScript();
  }, []);

  // Initiate payment when script and user are ready
  useEffect(() => {
    if (!scriptLoaded || !isLoaded || !user) return;

    const initiatePayment = async () => {
      try {
        const res = await fetch('/api/payment', { method: 'POST' });
        const data = await res.json();
        if (!data.subscriptionId) throw new Error('Subscription ID missing');

        const options = {
          key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID, // Public key from .env
          subscription_id: data.subscriptionId,
          name: 'Slide Webprodigies',
          description: 'Subscription Plan',
          handler: (response: any) => {
            console.log('Payment successful:', response);
            router.push(`/dashboard/${user.id}`); // Redirect using user.id
          },
          prefill: {
            email: user.emailAddresses[0].emailAddress,
            name: user.firstName || 'User',
          },
        };

        const razorpay = new window.Razorpay(options);
        razorpay.open();
      } catch (error) {
        console.error('Payment error:', error);
      }
    };

    initiatePayment();
  }, [scriptLoaded, isLoaded, user, router]);

  if (!isLoaded) return <div>Loading...</div>;
  return <div>Processing payment...</div>;
}