import { onBoardUser } from '@/actions/user';
import { redirect } from 'next/navigation';
import React from 'react';

type Props = {};

const Page = async (props: Props) => {
  const user = await onBoardUser();
  if (user.status === 200 || user.status === 201) {
    const first = user.data?.firstname?.trim() || '';
    const last = user.data?.lastname?.trim() || '';
    const fullName = `${first}-${last}`; // combine names with a hyphen
    // Use encodeURIComponent to ensure URL safety
    return redirect(`/dashboard/${encodeURIComponent(fullName)}`);
  }
  return redirect('/sign-in');
};

export default Page;
