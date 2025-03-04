import React from 'react';

const PaymentButton = () => {
  const handlePayment = async () => {
    const res = await fetch('/api/payment', { method: 'POST' });
    const data = await res.json();

    if (data.status !== 200) {
      console.error('Order creation failed:', data.error);
      return;
    }

    const options = {
      key: process.env.RAZORPAY_KEY_ID!,
      amount: data.order.amount,
      currency: data.order.currency,
      name: 'Your Company Name',
      description: 'Subscription Payment',
      order_id: data.order.id,
      handler: function (response: any) {
        // Handle payment success
        console.log('Payment successful:', response);
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

  return (
    <button onClick={handlePayment}>
      Pay ₹4.99
    </button>
  );
};

export default PaymentButton;
