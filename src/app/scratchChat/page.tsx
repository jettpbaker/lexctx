import { generateId } from 'ai'
import { redirect } from 'next/navigation'
import { upsertChat } from '~/server/actions/sources'

import { gzipAsync } from '../api/scratchChat/route'

export default async function Chat() {
  const id = generateId()
  const messagesGzip = await gzipAsync('[]')
  const messagesGzipBase64 = messagesGzip.toString('base64')
  await upsertChat(id, messagesGzipBase64, 0)
  redirect(`/scratchChat/${id}`)
}
