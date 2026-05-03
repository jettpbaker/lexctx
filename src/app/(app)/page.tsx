import { StartChatForm } from '~/app/(app)/start-chat-form'

export default function AppHomePage() {
  return (
    <div className='flex min-h-0 flex-1 flex-col items-center justify-center gap-4 p-6'>
      <div>
        <StartChatForm />
      </div>
    </div>
  )
}
