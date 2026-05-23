import NewChatForm from './new_chat_form'

export default function AppHomePage() {
  return (
    <div className='relative flex h-dvh min-h-0 w-full flex-1 flex-col overflow-hidden pt-[36px]'>
      <div className='flex flex-1 items-center justify-center px-6'>
        {/* <h1 className='text-center font-serif text-6xl text-balance text-whisper'>
          I don't know what to write here.
        </h1> */}
      </div>
      <div className='w-full'>
        <NewChatForm />
      </div>
    </div>
  )
}
