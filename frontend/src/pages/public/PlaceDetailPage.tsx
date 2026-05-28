import { ArrowLeft, Clock, Globe, Phone, Star } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { fetchPlace } from '@/api/places'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { ExternalActions } from '@/components/ExternalActions'
import { FavoriteButton } from '@/components/FavoriteButton'
import { ImagePlaceholder } from '@/components/ImagePlaceholder'
import { PlaceMenu } from '@/components/PlaceMenu'
import { formatWorkHours, safeHttpUrl } from '@/lib/format'


export function PlaceDetailPage() {
  const { id } = useParams<{ id: string }>()
  const placeId = id ? Number(id) : NaN

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['place', placeId],
    queryFn: () => fetchPlace(placeId),
    enabled: Number.isFinite(placeId),
  })

  if (!Number.isFinite(placeId)) {
    return <p className="text-destructive">Некорректный идентификатор заведения.</p>
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="aspect-[16/9] w-full" />
        <Skeleton className="h-6 w-2/3" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-32 w-full" />
      </div>
    )
  }

  if (isError) {
    return (
      <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
        Не удалось загрузить карточку: {(error as Error).message}
      </div>
    )
  }

  if (!data) return null

  const rating = data.rating_2gis ? Number(data.rating_2gis) : null
  const websiteUrl = safeHttpUrl(data.website)
  const workHours = formatWorkHours(data.work_hours)

  return (
    <article className="space-y-5">
      <Link
        to="/"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Назад к списку
      </Link>

      <div className="grid gap-4 md:grid-cols-[3fr_2fr] md:items-start">
        {data.photo_url ? (
          <img
            src={data.photo_url}
            alt={data.name}
            className="aspect-[16/9] w-full rounded-lg object-cover"
          />
        ) : (
          <ImagePlaceholder
            seed={data.name}
            alt={data.name}
            className="aspect-[16/9] w-full rounded-lg"
          />
        )}

        <div className="space-y-3">
          <header className="space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <h1 className="text-xl font-semibold tracking-tight">{data.name}</h1>
                <p className="text-sm text-muted-foreground">{data.address}</p>
              </div>
              <div className="flex items-center gap-2">
                {rating != null && (
                  <span className="inline-flex items-center gap-0.5 text-sm font-medium">
                    <Star className="h-4 w-4 fill-amber-400 stroke-amber-400" />
                    {rating.toFixed(1)}
                  </span>
                )}
                <FavoriteButton kind="place" id={data.id} />
              </div>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {data.category && <Badge variant="outline">{data.category.name}</Badge>}
              {data.cuisines.map((c) => (
                <Badge key={c.code} variant="secondary">
                  {c.name}
                </Badge>
              ))}
              {data.diet_tags.map((d) => (
                <Badge key={d.code} variant="outline">
                  {d.name}
                </Badge>
              ))}
              {data.price_band && (
                <Badge variant="outline">
                  средний чек {data.price_band.min_price}–{data.price_band.max_price} ₽
                </Badge>
              )}
            </div>
          </header>

          <ExternalActions
            placeId={data.id}
            address={data.address}
          />


          {data.description && (
            <section>
              <h2 className="mb-1 text-sm font-semibold text-muted-foreground">О заведении</h2>
              <p className="whitespace-pre-line text-sm leading-relaxed">{data.description}</p>
            </section>
          )}

          {data.upsell_highlights.length > 0 && (
            <section>
              <h2 className="mb-1 text-sm font-semibold text-muted-foreground">Фишки</h2>
              <ul className="space-y-1 text-sm">
                {data.upsell_highlights.map((h, i) => (
                  <li key={i}>· {h}</li>
                ))}
              </ul>
            </section>
          )}

          {data.amenities.length > 0 && (
            <section>
              <h2 className="mb-1 text-sm font-semibold text-muted-foreground">Удобства</h2>
              <div className="flex flex-wrap gap-1.5">
                {data.amenities.map((a) => (
                  <Badge key={a.code} variant="outline">
                    {a.name}
                  </Badge>
                ))}
              </div>
            </section>
          )}

          {(data.phone || websiteUrl) && (
            <section>
              <h2 className="mb-1 text-sm font-semibold text-muted-foreground">Контакты</h2>
              <ul className="space-y-1 text-sm">
                {data.phone && (
                  <li>
                    <a
                      href={`tel:${data.phone}`}
                      className="inline-flex items-center gap-1.5 hover:underline"
                    >
                      <Phone className="h-3.5 w-3.5" aria-hidden />
                      {data.phone}
                    </a>
                  </li>
                )}
                {websiteUrl && (
                  <li>
                    <a
                      href={websiteUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 hover:underline"
                    >
                      <Globe className="h-3.5 w-3.5" aria-hidden />
                      {websiteUrl.replace(/^https?:\/\//, '')}
                    </a>
                  </li>
                )}
              </ul>
            </section>
          )}

          {workHours && (
            <section>
              <h2 className="mb-1 text-sm font-semibold text-muted-foreground">Часы работы</h2>
              <p className="inline-flex items-center gap-1.5 text-sm">
                <Clock className="h-3.5 w-3.5" aria-hidden />
                {workHours}
              </p>
            </section>
          )}
        </div>
      </div>


      <section aria-labelledby="menu-heading">
        <h2 id="menu-heading" className="mb-3 text-lg font-semibold">
          Меню
        </h2>
        <PlaceMenu dishes={data.top_dishes} />
      </section>
    </article>
  )
}
