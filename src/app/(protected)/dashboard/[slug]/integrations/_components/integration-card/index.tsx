// /src/app/(protected)/dashboard/[slug]/integrations/_components/integration-card/index.tsx
'use client'
import { onOAuthInstagram } from '@/actions/integrations';
import { onUserInfo } from '@/actions/user';
import { Button } from '@/components/ui/button';
import { useQuery } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import type { Integrations, User } from '@prisma/client';

export default function IntegrationCard({
  strategy,
  title,
  description,
  icon
}: {
  strategy: 'INSTAGRAM' | 'CRM';
  title: string;
  description: string;
  icon: React.ReactNode;
}) {
  const router = useRouter();
  const { data, isLoading } = useQuery({
    queryKey: ['user-integrations'],
    queryFn: onUserInfo
  });

  const handleConnect = async () => {
    try {
      await onOAuthInstagram(strategy);
      router.refresh();
    } catch (error) {
      toast.error('Connection failed', {
        description: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  // Cast user info; mark integrations as optional and default to empty array.
  const userInfo = data?.data as (User & { integrations?: Integrations[] }) | undefined;
  const integrations: Integrations[] = userInfo?.integrations ?? [];
  const isConnected = integrations.some((i: Integrations) => i.name === strategy);

  return (
    <div className="border-2 border-[#3352CC] rounded-2xl p-5 flex items-center gap-4">
      {icon}
      <div className="flex-1">
        <h3 className="text-xl">{title}</h3>
        <p className="text-[#9D9D9D]">{description}</p>
      </div>
      <Button
        onClick={handleConnect}
        disabled={!!isConnected || isLoading}
        className="bg-gradient-to-br from-[#3352CC] to-[#1C2D70] text-white rounded-full hover:opacity-80"
      >
        {isLoading ? (
          <Loader2 className="animate-spin" />
        ) : isConnected ? (
          'Connected'
        ) : (
          'Connect'
        )}
      </Button>
    </div>
  );
}
