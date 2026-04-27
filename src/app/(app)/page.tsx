import Link from 'next/link'

import { buttonVariants } from '~/components/ui/button'
import { cn } from '~/lib/utils'

export default function AppHomePage() {
  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4 p-6">
      <h1 className="text-lg font-medium text-foreground/90">Lex</h1>
      <p className="text-muted-foreground max-w-md text-center text-sm">
        No chat selected. Start a new conversation to continue.
      </p>
      <Link
        href="/chat/new"
        className={cn(buttonVariants({ variant: 'default', size: 'default' }))}
      >
        Start a new chat
      </Link>
    </div>
  )
}
