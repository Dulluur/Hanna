import { userFavoritesStore } from '@/store/favorites'
import { Heart } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface Props{
  kind: 'place' | 'event'
  id: number
  className?: string
}

export function FavoriteButton({kind, id, className}: Props){
  const isFav = userFavoritesStore((s) =>
    kind === 'place' ? s.isPlaceFavorite(id) : s.isEventFavorite(id),
  )
  const toggle = userFavoritesStore((s) => (kind === 'place' ? s.togglePlace : s.toggleEvent))

  return(
    <Button
      type="button"
      variant="ghost"
      size="icon"
      aria-label={isFav ? 'Убрать из избранного' : 'В избранное'}
      aria-pressed={isFav}
      onClick={(e) => {
        e.stopPropagation()
        e.preventDefault()
        toggle(id)
      }}
        className={cn('shrink-0', className)}
      >
        <Heart
          className={cn(
            'h-5 w-5 transition-colors',
            isFav ? 'fill-red-500 stroke-red-500' : 'stroke-muted-foreground',
          )}
        />
      </Button>
  )
}
