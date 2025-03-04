'use client';

import React, { useEffect } from 'react';

const PaymentButton = () => {
  const handlePayment = async () => {
    const res = await fetch('/api/payment', { method: 'POST' });
    const data = await res.json();

    if (data.status !== 200) {
      console.error('Order creation failed:', data.error);
      return;
    }

    // Load Razorpay script dynamically
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    document.body.appendChild(script);

    script.onload = () => {
      const options = {
        key: 'your_razorpay_key_id_here', // Replace with your public key or fetch from server
        amount: data.order.amount,
        currency: data.order.currency,
        name: 'Your Company Name',
        description: 'Subscription Payment',
        order_id: data.order.id,
        handler: function (response: any) {
          console.log('Payment successful:', response);
          // Optionally redirect to a success page
          window.location.href = '/payment?subscription_id=' + response.razorpay_order_id;
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

      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    };
  };

  return (
    <button onClick={handlePayment} className="bg-blue-500 text-white p-2 rounded">
      Pay ₹4.99
    </button>
  );
};

export default PaymentButton;