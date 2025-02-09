// src/components/global/billing/index.tsx
import React from 'react';
import PaymentCard from './payment-card';
import { useQuery } from '@tanstack/react-query';
import { onUserInfo } from '@/actions/user';

// Define the type for the user info we expect from the query.
interface UserInfo {
  id: string;
  clerkId: string;
  email: string;
  firstname: string | null;
  lastname: string | null;
  createdAt: Date;
  // Subscription plan must be either "PRO" or "FREE"
  subscription: { plan: "PRO" | "FREE" } | null;
  integrations: any[];
}

export default function Billing() {
  const { data, isLoading } = useQuery({
    queryKey: ['user-info'],
    queryFn: onUserInfo,
  });

  // Cast the returned data to our UserInfo type.
  const userInfo = data?.data as UserInfo | undefined;

  return (
    <div className="flex lg:flex-row flex-col gap-5 w-full lg:w-10/12 xl:w-8/12 container">
      <PaymentCard
        // Cast the value to "PRO" | "FREE". If no subscription exists, default to "FREE".
        current={(userInfo?.subscription?.plan ?? "FREE") as "PRO" | "FREE"}
        label="PRO"
      />
      {/* Render other components as needed */}
    </div>
  );
}
