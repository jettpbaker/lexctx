import NewChatForm from './new_chat_form'

export default function AppHomePage() {
  return (
    <div className='relative flex h-dvh min-h-0 w-full flex-1 flex-col justify-end overflow-hidden pt-[36px]'>
      <div className='w-full px-[36px]'>
        <NewChatForm />
      </div>
    </div>
  )
}
