// /src/app/(protected)/callback/instagram/page.tsx
import { onIntegrate } from '@/actions/integrations';
import { redirect } from 'next/navigation';

type Props = {
  searchParams: {
    code?: string;
    error?: string;
  };
};

export default async function Page({ searchParams }: Props) {
  // Get the code from searchParams, stripping any fragment if present.
  const code = searchParams.code?.split('#_')[0];

  if (!code) {
    return redirect('/dashboard/integrations?error=missing_code');
  }

  try {
    const result = await onIntegrate(code);

    if ('error' in result) {
      console.error('Integration failed:', result.error);
      return redirect('/dashboard/integrations?error=instagram_failed');
    }

    // Build the redirect URL in a variable.
    const redirectUrl =
      `/dashboard/integrations?success=true` +
      (result.data?.name ? `&user=${encodeURIComponent(result.data.name)}` : '');

    return redirect(redirectUrl);
  } catch (error) {
    console.error('Unexpected error:', error);
    return redirect('/dashboard/integrations?error=unexpected_error');
  }
}
