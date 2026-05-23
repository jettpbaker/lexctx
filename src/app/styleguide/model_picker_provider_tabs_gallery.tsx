'use client'

import { useState } from 'react'
import { ChatModelPicker } from '~/components/chat/chat_model_picker'
import { DEFAULT_CHAT_MODEL_ID, type ChatModelId } from '~/server/ai/modelMapping'

function ComposerFooterFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className='rounded-2xl border border-border bg-card p-3 shadow-sm'>
      <div className='mb-3 flex h-10 items-center rounded-full border border-border bg-background px-4 text-sm text-muted-foreground'>
        Send follow up
      </div>
      <div className='flex min-h-[35px] items-center justify-between gap-3 px-1'>
        {children}
        <span className='shrink-0 font-mono text-xs text-muted-foreground'>62%</span>
      </div>
    </div>
  )
}

export function ModelPickerProviderTabsGallery() {
  const [modelId, setModelId] = useState<ChatModelId>(DEFAULT_CHAT_MODEL_ID)

  return (
    <div className='flex max-w-md flex-col gap-3'>
      <ComposerFooterFrame>
        <ChatModelPicker modelId={modelId} onModelChange={setModelId} />
      </ComposerFooterFrame>
      <p className='text-[11px] text-muted-foreground'>
        Selected: <span className='font-mono text-foreground'>{modelId}</span>
      </p>
    </div>
  )
}
