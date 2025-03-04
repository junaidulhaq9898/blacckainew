import { redirect } from 'next/navigation';
import React from 'react';

type Props = {
  searchParams: {
    subscription_id?: string;
    cancel?: boolean;
  };
};

const Page = async ({ searchParams: { cancel, subscription_id } }: Props) => {
  if (subscription_id) {
    return redirect('/dashboard'); // Redirect to dashboard after payment
  }

  if (cancel) {
    return (
      <div className="flex flex-col justify-center items-center h-screen w-full">
        <h4 className="text-5xl font-bold">404</h4>
        <p className="text-xl font-bold">Oops! Something went wrong</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col justify-center items-center h-screen w-full">
      <h4 className="text-5xl font-bold">Processing...</h4>
      <p className="text-xl font-bold">Please complete your payment.</p>
    </div>
  );
};

export default Page;