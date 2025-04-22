import { v4 } from 'uuid'

type Props = {
  id: string
  label: string
  subLabel: string
  description: string
}

export const DASHBOARD_CARDS: Props[] = [
  {
    id: v4(),
    label: 'Automate Instagram DMs',
    subLabel: 'Showcase products through engaging conversations',
    description: 'Deliver personalized product recommendations directly in DMs — automated, yet crafted to feel genuinely human.',
  },
  {
    id: v4(),
    label: 'AI That Understands and Responds',
    subLabel: 'Handle questions with intelligence and empathy',
    description: 'AI identifies intent and delivers tailored responses, making every interaction feel like a real conversation with your brand.',
  },
  {
    id: v4(),
    label: 'Custom Replies with a Human Touch',
    subLabel: 'Let AI craft unique responses that resonate',
    description: 'Every message feels thoughtfully written — AI adapts tone, context, and content to create meaningful, natural interactions.',
  },
]
