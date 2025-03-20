// /app/payment/page.tsx
"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';

declare global {
  interface Window {
    Razorpay: any;
  }
}

export default function PaymentPage() {
  const router = useRouter();
  const { user, isLoaded } = useUser();

  useEffect(() => {
    if (!isLoaded || !user) return;

    const initiatePayment = async () => {
      try {
        console.log('Fetching subscription...');
        const response = await fetch('/api/payment', { method: 'POST' });
        const data = await response.json();
        if (data.status !== 200) {
          throw new Error(data.message || 'Failed to initiate payment');
        }
        console.log('Received subscriptionId:', data.subscriptionId);

        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.onload = () => {
          console.log('Razorpay script loaded');
          const options = {
            key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
            subscription_id: data.subscriptionId,
            name: 'Blacck AI',
            description: 'Upgrade to PRO',
            handler: function (response: any) {
              console.log('Payment successful:', response);
              router.push(`/dashboard/${data.userId}`);
            },
            prefill: {
              email: user.emailAddresses[0].emailAddress,
              name: user.firstName || 'User',
            },
          };
          const rzp = new window.Razorpay(options);
          rzp.open();
        };
        script.onerror = () => {
          console.error('Failed to load Razorpay script');
        };
        document.body.appendChild(script);
      } catch (error) {
        console.error('Payment initiation error:', error);
      }
    };

    initiatePayment();
  }, [isLoaded, user, router]);

  if (!isLoaded) return <div>Loading...</div>;
  return <div>Processing your payment...</div>;
}