// /src/app/(protected)/dashboard/[slug]/integrations/page.tsx
import { INTEGRATION_CARDS } from '@/constants/integrations'
import React from 'react'
import IntegrationCard from './_components/integration-card'

export default function Page() {
  // Defensive: default to an empty array if for some reason it’s undefined
  const cards = INTEGRATION_CARDS ?? []

  return (
    <div className="flex justify-center">
      <div className="flex flex-col w-full lg:w-8/12 gap-y-5">
        {cards.map((card, key) => (
          <IntegrationCard key={key} {...card} />
        ))}
      </div>
    </div>
  )
}
