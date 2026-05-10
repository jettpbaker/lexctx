import { HugeiconsIcon } from '@hugeicons/react'
import { Shimmer } from '~/components/ai-elements/shimmer'
import { getToolUiMapping } from '~/components/chat/toolUiMapping'

export type ToolStatus = 'in-flight' | 'completed' | 'error'

export function ToolStatusRow({ toolName, status }: { toolName: string; status: ToolStatus }) {
  const toolUi = getToolUiMapping(toolName)

  const icon = toolUi.icon ? (
    <HugeiconsIcon icon={toolUi.icon} strokeWidth={2} className='size-4.5' />
  ) : null

  if (status === 'error') {
    return (
      <div className='mb-2 flex items-center gap-2 text-sm text-muted-foreground'>
        {icon}
        Failed: {toolUi.text}
      </div>
    )
  }

  if (status === 'in-flight') {
    return (
      <div className='mb-2 flex items-center gap-2 text-muted-foreground'>
        {icon}
        <Shimmer
          color='var(--color-muted-foreground)'
          shimmerColor='var(--color-foreground)'
          duration={1.25}
          spread={2}
          className='text-sm'
        >
          {toolUi.text}
        </Shimmer>
      </div>
    )
  }

  return (
    <div className='mb-2 flex items-center gap-2 text-sm text-muted-foreground'>
      {icon}
      {toolUi.completedText}
    </div>
  )
}
