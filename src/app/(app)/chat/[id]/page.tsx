type ChatPageProps = {
  params: Promise<{ id: string }>
}

export default async function ChatPage({ params }: ChatPageProps) {
  const { id } = await params

  return (
    <div className='flex min-h-0 flex-1 flex-col items-center justify-center gap-4 p-6'>
      <h1 className='text-lg font-medium text-foreground/90'>Chat: {id}</h1>
      <p className='max-w-md text-center text-sm text-muted-foreground'>
        Shell placeholder. Messages and streaming will go here.
      </p>
      <div className='flex w-full max-w-md gap-2'>
        <input
          type='text'
          className='flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm'
          placeholder='Message the agent…'
          disabled
          readOnly
        />
        <button
          type='button'
          className='inline-flex shrink-0 items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground opacity-50'
          disabled
        >
          Send
        </button>
      </div>
    </div>
  )
}
