'use client'; // Mark this as a Client Component since Razorpay runs in the browser

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

// Extend the Window interface to recognize Razorpay
declare global {
  interface Window {
    Razorpay: any; // Basic type; refine with specific Razorpay types if available
  }
}

// Define the structure of the Razorpay response
interface RazorpayResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

// Main Payment Page Component
export default function PaymentPage() {
  const router = useRouter();

  // Function to load the Razorpay script dynamically
  const loadRazorpayScript = () => {
    return new Promise<void>((resolve) => {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve();
      script.onerror = () => {
        console.error('Failed to load Razorpay script');
        resolve(); // Resolve anyway to avoid blocking, but you might want to handle this differently
      };
      document.body.appendChild(script);
    });
  };

  // Function to initiate the payment
  const initiatePayment = async () => {
    // Ensure the script is loaded before proceeding
    await loadRazorpayScript();

    if (!window.Razorpay) {
      console.error('Razorpay SDK not loaded');
      return;
    }

    // Example options for Razorpay (replace with your actual order details)
    const options = {
      key: 'YOUR_RAZORPAY_KEY', // Replace with your Razorpay key
      amount: 50000, // Amount in paise (e.g., 500 INR = 50000 paise)
      currency: 'INR',
      name: 'Your Company Name',
      description: 'Test Transaction',
      order_id: 'YOUR_ORDER_ID', // Fetch this from your backend
      handler: function (response: RazorpayResponse) {
        // Handle successful payment
        console.log('Payment successful:', response);
        router.push('/dashboard'); // Redirect after success
      },
      prefill: {
        name: 'Customer Name',
        email: 'customer@example.com',
        contact: '9999999999',
      },
      notes: {
        address: 'Customer Address',
      },
      theme: {
        color: '#3399cc',
      },
    };

    // Initialize and open Razorpay checkout
    const rzp = new window.Razorpay(options);
    rzp.on('payment.failed', function (response: any) {
      console.error('Payment failed:', response.error);
      alert('Payment failed. Please try again.');
    });
    rzp.open();
  };

  // Trigger payment on component mount (or tie this to a button click)
  useEffect(() => {
    initiatePayment();
  }, []);

  return (
    <div>
      <h1>Processing Payment...</h1>
      {/* You can add a button here to trigger initiatePayment manually */}
      {/* <button onClick={initiatePayment}>Pay Now</button> */}
    </div>
  );
}