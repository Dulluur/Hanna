import { cn } from '@/lib/utils'


function stringToHue(s: string): number {
  let hash = 0
  for (let i = 0; i < s.length; i++) {
    hash = (hash << 5) - hash + s.charCodeAt(i)
    hash |= 0
  }
  return Math.abs(hash) % 360
}


function initials(s: string): string {
  const words = s.split(/\s+/).filter(Boolean)
  if (words.length === 0) return '·'
  if (words.length === 1) return words[0]!.slice(0, 1).toUpperCase()
  return (words[0]!.slice(0, 1) + words[1]!.slice(0, 1)).toUpperCase()
}


interface Props {
  seed: string
  className?: string
  alt?: string
}


export function ImagePlaceholder({ seed, className, alt }: Props) {
  const h1 = stringToHue(seed)
  const h2 = (h1 + 40) % 360
  const gradient = `linear-gradient(135deg, hsl(${h1} 60% 65%), hsl(${h2} 65% 50%))`

  
  return (
    <div
      role="img"
      aria-label={alt ?? seed}
      style={{ background: gradient }}
      className={cn(
        'flex items-center justify-center text-white/90 font-semibold tracking-wide select-none',
        className,
      )}
    >
      <span className="text-3xl drop-shadow-sm">{initials(seed)}</span>
    </div>
  )
}
