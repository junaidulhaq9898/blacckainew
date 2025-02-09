// integraion.tsx (or maybe integrations.tsx?)
import { InstagramDuoToneBlue, SalesForceDuoToneBlue } from "@/icons"

type Props = {
  title: string
  icon: React.ReactNode
  description: string
  strategy: 'INSTAGRAM' | 'CRM'
}

export const INTEGRATION_CARDS: Props[] = [
  {
    title: 'Connect Instagram',
    description:
      'Integrate your Instagram account to automate replies for direct messages and comments, saving you time and effort.',
    icon: <InstagramDuoToneBlue />,
    strategy: 'INSTAGRAM',
  },
  {
    title: 'Connect Salesforce',
    description:
      'Seamlessly sync your Salesforce CRM to manage leads and customer interactions more effectively.',
    icon: <SalesForceDuoToneBlue />,
    strategy: 'CRM',
  },
]
