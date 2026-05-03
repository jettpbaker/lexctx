import { generateId } from 'ai'
import { existsSync, mkdirSync } from 'fs'
import { writeFile } from 'fs/promises'
import { redirect } from 'next/navigation'
import path from 'path'

export async function createChat(): Promise<string> {
  const id = generateId() // generate a unique chat ID
  await writeFile(getChatFile(id), '[]') // create an empty chat file
  return id
}

export function getChatFile(id: string): string {
  const chatDir = path.join(process.cwd(), '.chats')
  if (!existsSync(chatDir)) mkdirSync(chatDir, { recursive: true })
  return path.join(chatDir, `${id}.json`)
}

export default async function Chat() {
  const id = await createChat()
  redirect(`/scratchChat/${id}`)
}
