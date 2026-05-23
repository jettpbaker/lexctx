import { cookies } from 'next/headers'
import { CHAT_MODEL_COOKIE_NAME, parseChatModelCookieValue } from '~/lib/chat_model_cookie'

import NewChatForm from './new_chat_form'

export default async function AppHomePage() {
  const cookieStore = await cookies()
  const initialModelId = parseChatModelCookieValue(cookieStore.get(CHAT_MODEL_COOKIE_NAME)?.value)

  return (
    <div className='relative flex h-dvh min-h-0 w-full flex-1 flex-col overflow-hidden pt-[36px]'>
      <div className='flex flex-1 items-center justify-center px-6'>
        {/* <h1 className='text-center font-serif text-6xl text-balance text-whisper'>
          I don't know what to write here.
        </h1> */}
      </div>
      <div className='w-full'>
        <NewChatForm initialModelId={initialModelId} />
      </div>
    </div>
  )
}
