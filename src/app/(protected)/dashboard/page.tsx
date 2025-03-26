import { onBoardUser } from '@/actions/user';
import { redirect } from 'next/navigation';
import React from 'react';

const DashboardRedirect = async () => {
  const user = await onBoardUser();
  if (user.status === 200 || user.status === 201) {
    const first = user.data?.firstname?.trim() || '';
    const last = user.data?.lastname?.trim() || '';
    const fullName = `${first} ${last}`.trim();
    const urlName = encodeURIComponent(fullName.toLowerCase().replace(/\s+/g, '-'));
    return redirect(`/dashboard/${urlName}`);
  }
  return redirect('/sign-in');
};

export default DashboardRedirect;
