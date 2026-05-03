'use client'

import { startChatFromHome } from '~/app/(app)/start-chat-action'

export const HOME_SUBMIT_AT_SESSION_KEY = 'lexctx:homeSubmitAtMs'

export function StartChatForm() {
  return (
    <form
      action={startChatFromHome}
      onSubmit={() => {
        sessionStorage.setItem(HOME_SUBMIT_AT_SESSION_KEY, String(Date.now()))
      }}
    >
      <input type='text' name='message' placeholder='Enter your message' />
      <button type='submit'>Send</button>
    </form>
  )
}
