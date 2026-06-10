import { cn } from '@/lib/utils'


interface LogoProps {
  className?: string
}


export function Logo({ className }: LogoProps) {
  return (
    <img
      src="/pwa-192x192.png"
      alt="Hanna"
      className={cn('object-contain', className)}
      draggable={false}
    />
  )
}
