import { cn } from '~/lib/utils'
import type { ChatModelLogo } from '~/server/ai/modelMapping'

const logoClassName = 'size-3.5 shrink-0'

export function ModelLogo({ logo, className }: { logo: ChatModelLogo; className?: string }) {
  if (logo.kind === 'static') {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- Static local SVG logos do not need Next image optimization.
      <img
        src={logo.src}
        alt=''
        aria-hidden
        className={cn(logoClassName, className)}
      />
    )
  }

  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element -- Static local SVG logos do not need Next image optimization. */}
      <img
        src={logo.lightSrc}
        alt=''
        aria-hidden
        className={cn(logoClassName, 'dark:hidden', className)}
      />
      {/* eslint-disable-next-line @next/next/no-img-element -- Static local SVG logos do not need Next image optimization. */}
      <img
        src={logo.darkSrc}
        alt=''
        aria-hidden
        className={cn(logoClassName, 'hidden dark:block', className)}
      />
    </>
  )
}
