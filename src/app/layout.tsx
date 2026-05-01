import './globals.css'
import { Geist, Geist_Mono, Roboto } from 'next/font/google'
import QueryProvider from '~/components/query_provider'
import { ThemeProvider } from '~/components/theme-provider'
import { TooltipProvider } from '~/components/ui/tooltip'
import { cn } from '~/lib/utils'

const robotoHeading = Roboto({ subsets: ['latin'], variable: '--font-heading' })

const geist = Geist({ subsets: ['latin'], variable: '--font-sans' })

const fontMono = Geist_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
})

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
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
        'h-full'
      )}
    >
      <body className='h-full'>
        <ThemeProvider>
          <TooltipProvider>
            <QueryProvider>{children}</QueryProvider>
          </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
