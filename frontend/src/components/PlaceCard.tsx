import { Star } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { PlaceListItem } from '@/api/types'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { FavoriteButton } from '@/components/FavoriteButton'
import { HeartBurst } from '@/components/HeartBurst'
import { ImagePlaceholder } from '@/components/ImagePlaceholder'
import { formatPriceBand } from '@/lib/format'
import { useDoubleTapLike } from '@/lib/use-double-tap-like'


interface Props {
  place: PlaceListItem
  upsell?: {
    deltaPct: number
    deltaRub: number
    reasons: string[]
  }
  priority?: boolean
}


export function PlaceCard({ place, upsell, priority = false }: Props) {
  const rating = place.rating_2gis ? Number(place.rating_2gis) : null
  const { onClick, burst, onBurstEnd } = useDoubleTapLike(
    'place',
    place.id,
    `/places/${place.id}`,
  )

  return (
    <Link
      to={`/places/${place.id}`}
      onClick={onClick}
      className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg"
    >
      <Card
        className={
          upsell
            ? 'relative overflow-hidden border-2 border-primary/30 bg-primary/[0.03]'
            : 'relative overflow-hidden hover:border-primary/40 transition-colors'
        }
      >
        <HeartBurst show={burst} onEnd={onBurstEnd} />
        {place.photo_url ? (
          <img
            src={place.photo_url}
            alt={place.name}
            className="aspect-[16/9] w-full object-cover"
            loading={priority ? 'eager' : 'lazy'}
            fetchPriority={priority ? 'high' : 'auto'}
          />
        ) : (
          <ImagePlaceholder
            seed={place.name}
            alt={place.name}
            className="aspect-[16/9] w-full"
          />
        )}

        <CardContent className="p-4 pt-3">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h3 className="truncate text-base font-semibold leading-tight">
                  {place.name}
                </h3>
                {rating != null && (
                  <span className="inline-flex shrink-0 items-center gap-0.5 text-sm font-medium">
                    <Star className="h-3.5 w-3.5 fill-amber-400 stroke-amber-400" />
                    {rating.toFixed(1)}
                  </span>
                )}
              </div>
              <p className="mt-0.5 truncate text-sm text-muted-foreground">{place.address}</p>
            </div>

            <FavoriteButton kind="place" id={place.id} />
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {place.category && <Badge variant="outline">{place.category.name}</Badge>}
            {place.cuisines.slice(0, 3).map((c) => (
              <Badge key={c.code} variant="secondary">
                {c.name}
              </Badge>
            ))}
            {place.price_band && (
              <Badge variant="outline" className="ml-auto">
                {formatPriceBand(
                  place.price_band.min_price,
                  place.price_band.max_price,
                )}
              </Badge>
            )}
          </div>

          {upsell && (
            <div className="mt-3 rounded-md bg-primary/10 p-2.5">
              <div className="flex items-center justify-between text-xs font-medium">
                <span>Чуть дороже</span>
                <span className="rounded-full bg-primary px-2 py-0.5 text-primary-foreground">
                  +{upsell.deltaPct}% · {upsell.deltaRub} ₽
                </span>
              </div>
              <ul className="mt-1.5 space-y-0.5 text-xs text-muted-foreground">
                {upsell.reasons.map((r, i) => (
                  <li key={i}>· {r}</li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  )
}
