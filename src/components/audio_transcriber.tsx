import { start } from 'workflow/api'
import { transcribeWorkflow } from '~/workflows/transcribe'

import { Button } from './ui/button'

export function AudioTranscriber() {
  return (
    <div>
      <h1>Transcribe Audio</h1>
      <form
        action={async (formData: FormData) => {
          'use server'

          const url = formData.get('audioUrl')
          if (typeof url !== 'string') {
            console.error('URL is not a string')
            return
          }

          const run = await start(transcribeWorkflow, [url])
          console.log({ run })
        }}
      >
        <label>
          Audio URL
          <input required type='url' name='audioUrl' className='border-4 border-indigo-500' />
          <br />
          <Button type='submit'>Transcribe</Button>
        </label>
      </form>
    </div>
  )
}
