import { cookies } from 'next/headers'
import {
  LAST_USED_CHAT_MODEL_COOKIE_NAME,
  parseLastUsedChatModelCookieValue,
} from '~/lib/chat_model_cookie'

import NewChatForm from './new_chat_form'

export default async function AppHomePage() {
  const cookieStore = await cookies()
  const initialModelId = parseLastUsedChatModelCookieValue(
    cookieStore.get(LAST_USED_CHAT_MODEL_COOKIE_NAME)?.value
  )

  return (
    <div className='relative flex h-dvh min-h-0 w-full flex-1 flex-col overflow-hidden pt-[36px]'>
      <NewChatForm initialModelId={initialModelId} />
    </div>
  )
}
