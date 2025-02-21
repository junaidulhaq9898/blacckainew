// src/app/(protected)/callback/instagram/page.tsx
import { onIntegrate } from '@/actions/integrations';
import { redirect } from 'next/navigation';

type Props = {
  searchParams: {
    code?: string;
    error?: string;
  };
};

export default async function Page({ searchParams }: Props) {
  const code = searchParams.code?.split('#_')[0];

  if (!code) {
    redirect('/dashboard/integrations?error=missing_code');
    return null;
  }

  const result = await onIntegrate(code);

  if ('error' in result) {
    console.error('Integration failed:', result.error);
    redirect('/dashboard/integrations?error=instagram_failed');
    return null;
  }

  const redirectUrl =
    `/dashboard/integrations?success=true` +
    (result.data?.name ? `&user=${encodeURIComponent(result.data.name)}` : '');
  redirect(redirectUrl);
  return null;
}