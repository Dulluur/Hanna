import { cn } from '@/lib/utils'

interface LogoProps {
  className?: string
  letterClassName?: string
}

export function Logo({ className, letterClassName }: LogoProps) {
  return (
    <div
      className={cn(
        'flex items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-violet-700 text-white shadow-lg ring-4 ring-background',
        className,
      )}
      aria-hidden
    >
      <span
        className={cn('font-bold tracking-tight leading-none', letterClassName ?? 'text-xl')}
      >
        H
      </span>
    </div>
  )
}
