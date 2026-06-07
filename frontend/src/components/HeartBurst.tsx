import { Heart } from 'lucide-react'

interface Props {
  show: boolean
  onEnd: () => void
}


export function HeartBurst({ show, onEnd }: Props) {
  if (!show) return null
  return (
    <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
      <Heart
        className="h-20 w-20 animate-[likeburst_700ms_ease-out] fill-red-500 stroke-red-500 drop-shadow-lg"
        onAnimationEnd={onEnd}
      />
    </div>
  )
}
