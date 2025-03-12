// components/global/sidebar/upgrade.tsx
import React from 'react';
import PaymentButton from '../PaymentButton';
import { Loader2 } from 'lucide-react';

const UpgradeCard = () => {
  return (
    <div className="bg-[#252525] p-3 rounded-2xl flex flex-col gap-y-3">
      {/* ... other content */}
      
      <PaymentButton
        className="bg-gradient-to-r from-[#CC3BD4] to-[#D064AC] text-white px-4 py-2 rounded-lg hover:opacity-90 transition-opacity"
        loadingComponent={
          <div className="flex items-center justify-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Processing...</span>
          </div>
        }
      >
        Upgrade to PRO
      </PaymentButton>
    </div>
  );
};