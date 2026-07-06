import './globals.css'
import { EB_Garamond, Geist, Geist_Mono, Roboto } from 'next/font/google'
import { preload } from 'react-dom'
import QueryProvider from '~/components/query_provider'
import { ThemeProvider } from '~/components/theme-provider'
import { Toaster } from '~/components/ui/sonner'
import { TooltipProvider } from '~/components/ui/tooltip'
import { cn } from '~/lib/utils'

const MODEL_LOGO_ASSETS = [
  '/model-logos/anthropic-dark.svg',
  '/model-logos/anthropic-light.svg',
  '/model-logos/claude.svg',
  '/model-logos/grok-dark.svg',
  '/model-logos/grok-light.svg',
  '/model-logos/openai-dark.svg',
  '/model-logos/openai-light.svg',
  '/model-logos/xai-dark.svg',
  '/model-logos/xai-light.svg',
] as const

const robotoHeading = Roboto({ subsets: ['latin'], variable: '--font-heading' })

const geist = Geist({ subsets: ['latin'], variable: '--font-sans' })

const fontMono = Geist_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
})

const fontSerif = EB_Garamond({
  subsets: ['latin'],
  variable: '--font-serif',
  display: 'swap',
})

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  for (const src of MODEL_LOGO_ASSETS) {
    preload(src, { as: 'image' })
  }

  return (
    <html
      lang='en'
      suppressHydrationWarning
      className={cn(
        'antialiased',
        fontMono.variable,
        'font-sans',
        robotoHeading.variable,
        'font-sans',
        geist.variable,
        fontSerif.variable,
        'h-full'
      )}
    >
      <body className='h-full'>
        <ThemeProvider>
          <TooltipProvider>
            <QueryProvider>{children}</QueryProvider>
            <Toaster />
          </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
