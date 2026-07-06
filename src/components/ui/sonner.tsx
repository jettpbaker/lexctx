'use client'

import { useTheme } from 'next-themes'
import { Toaster as Sonner, type ToasterProps } from 'sonner'

function Toaster({ ...props }: ToasterProps) {
  const { resolvedTheme } = useTheme()

  return (
    <Sonner
      theme={(resolvedTheme as ToasterProps['theme']) ?? 'system'}
      position='bottom-right'
      toastOptions={{
        classNames: {
          toast:
            'group flex w-full items-center gap-2 rounded-lg bg-popover p-3 text-xs/relaxed text-popover-foreground shadow-md ring-1 ring-foreground/10',
          title: 'text-xs font-medium text-foreground',
          description: 'text-xs text-muted-foreground',
          actionButton:
            'ml-auto shrink-0 rounded-md bg-primary px-2 py-1 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/80',
          cancelButton:
            'shrink-0 rounded-md px-2 py-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground',
          error: 'text-destructive [&_[data-icon]]:text-destructive',
          icon: 'shrink-0',
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
