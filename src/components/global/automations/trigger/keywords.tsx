import { Input } from '@/components/ui/input'
import { useKeywords } from '@/hooks/use-automations'
import { useMutationDataState } from '@/hooks/use-mutation-data'
import { useQueryAutomation } from '@/hooks/user-queries'
import React, { useEffect } from 'react'

type Props = {
  id: string
}

export const Keywords = ({ id }: Props) => {
  const { onValueChange, keyword, onKeyPress, deleteMutation } = useKeywords(id)
  const { latestVariable } = useMutationDataState(['add-keyword'])
  const { data, isLoading } = useQueryAutomation(id)

  // Debug logging for keywords state
  useEffect(() => {
    if (data?.data?.keywords) {
      console.log('Keywords State:', {
        automationId: id,
        existingKeywords: data.data.keywords,
        pendingKeyword: keyword,
        latestMutation: latestVariable
      })
    }
  }, [data, keyword, latestVariable, id])

  return (
    <div className="bg-background-80 flex flex-col gap-y-3 p-3 rounded-xl">
      <div className="flex flex-col gap-y-2">
        <p className="text-sm font-medium">Keywords</p>
        <p className="text-sm text-text-secondary">
          Add words that trigger this automation
        </p>
      </div>

      <div className="flex flex-wrap justify-start gap-2 items-center min-h-[40px]">
        {/* Existing keywords */}
        {data?.data?.keywords &&
          data?.data?.keywords.length > 0 &&
          data?.data?.keywords.map(
            (word) =>
              word.id !== latestVariable?.variables?.id && (
                <div
                  className="bg-background-90 flex items-center gap-x-2 capitalize text-text-secondary py-1 px-4 rounded-full"
                  key={word.id}
                >
                  <p>{word.word}</p>
                </div>
              )
          )}

        {/* Pending keyword */}
        {latestVariable && latestVariable.status === 'pending' && (
          <div className="bg-background-90 flex items-center gap-x-2 capitalize text-text-secondary py-1 px-4 rounded-full animate-pulse">
            {latestVariable.variables.keyword}
          </div>
        )}

        {/* Keyword input */}
        <Input
          placeholder="Type keyword and press Enter..."
          style={{
            width: Math.min(Math.max((keyword?.length || 10) * 8, 120), 300) + 'px',
          }}
          value={keyword}
          className="p-2 bg-background-90 ring-0 border-none outline-none rounded-full"
          onChange={onValueChange}
          onKeyUp={onKeyPress}
          disabled={isLoading}
        />
      </div>

      {/* Helper text */}
      <p className="text-xs text-text-secondary mt-2">
        Press Enter to add each keyword. Keywords are case-insensitive.
      </p>
    </div>
  )
}

export default Keywords