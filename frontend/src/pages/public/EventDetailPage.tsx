import { ArrowLeft, CalendarDays, Ticket } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { fetchEvent } from '@/api/events'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { ExternalActions } from '@/components/ExternalActions'
import { FavoriteButton } from '@/components/FavoriteButton'
import { PhotoGallery } from '@/components/PhotoGallery'
import { trackMetric } from '@/api/metrics'
import { useBudgetStore } from '@/store/budget'
import { formatEventStart, formatRub } from '@/lib/format'


export function EventDetailPage() {
  const { id } = useParams<{ id: string }>()
  const eventId = id ? Number(id) : NaN
  const budget = useBudgetStore((s) => s.budget)

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['event', eventId],
    queryFn: () => fetchEvent(eventId),
    enabled: Number.isFinite(eventId),
  })

  if (!Number.isFinite(eventId)) {
    return <p className="text-destructive">Некорректный идентификатор события.</p>
  }


  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="aspect-[16/9] w-full" />
        <Skeleton className="h-6 w-2/3" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-20 w-full" />
      </div>
    )
  }


  if (isError) {
    return (
      <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
        Не удалось загрузить событие: {(error as Error).message}
      </div>
    )
  }


  if (!data) return null


  const isFree = data.price === 0 || data.price == null
  const ticketPrice = data.price ?? 0


  let budgetBadge: {
    ticketFits: boolean
    ticketDelta: number
    combo: { total: number; mealMin: number; fits: boolean; delta: number } | null
  } | null = null

  if (budget != null) {
    const ticketFits = ticketPrice <= budget
    const ticketDelta = ticketPrice - budget

    let combo:
    | { total: number; mealMin: number; fits: boolean; delta: number }
    | null = null
    if (data.place?.price_band) {
      const mealMin = data.place.price_band.min_price
      const total = ticketPrice + mealMin
      combo = {
        total,
        mealMin,
        fits: total <= budget,
        delta: total - budget,
      }
    }

    budgetBadge = { ticketFits, ticketDelta, combo }
  }

  return (
    <article className="space-y-4">
      <Link
        to="/events"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Назад к афише
      </Link>


      <div className="grid gap-4 md:grid-cols-[3fr_2fr] md:items-start">
        <PhotoGallery
          images={[data.photo_url, ...data.photos].filter(Boolean) as string[]}
          alt={data.title}
          seed={data.title}
        />

        <div className="space-y-4">
          <header className="space-y-2">
            <div className="flex items-start justify-between gap-2">
              <h1 className="text-xl font-semibold tracking-tight">{data.title}</h1>
              <FavoriteButton kind="event" id={data.id} />
            </div>

            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <CalendarDays className="h-4 w-4" aria-hidden />
                {formatEventStart(data.starts_at)}
              </span>
              <span className="inline-flex items-center gap-1">
                <Ticket className="h-4 w-4" aria-hidden />
                {isFree ? 'Бесплатно' : formatRub(ticketPrice)}
              </span>
            </div>

            <div className="flex flex-wrap gap-1.5 pt-1">
              {data.event_type && <Badge variant="outline">{data.event_type.name}</Badge>}
              {data.age_group && <Badge variant="outline">{data.age_group.name}</Badge>}
            </div>
          </header>

          {budgetBadge && (
            <div
              className={
                'rounded-lg border p-3 text-sm ' +
                (budgetBadge.ticketFits
                  ? 'border-emerald-300 bg-emerald-50 text-emerald-900'
                  : 'border-amber-300 bg-amber-50 text-amber-900')
              }
            >
              {budgetBadge.ticketFits ? (
                <div className="font-medium">
                  {isFree
                    ? 'Бесплатно - укладывается в бюджет'
                    : `Билет ${formatRub(ticketPrice)} укладывается в бюджет (${formatRub(budget!)})`}
                </div>
              ) : (
                <div className="font-medium">
                  Билет превышает бюджет на {formatRub(budgetBadge.ticketDelta)} (бюджет {formatRub(budget!)})
                </div>
              )}


              {budgetBadge.combo && (
                <div className="mt-1.5 text-xs opacity-90">
                  {budgetBadge.combo.fits ? (
                    <>
                      Если поужинать в этом заведении: {formatRub(ticketPrice)} + ужин от{' '}
                      {formatRub(budgetBadge.combo.mealMin)} = {formatRub(budgetBadge.combo.total)} -
                      тоже укладывается
                    </>
                  ) : (
                    <>
                      С ужином в этом заведении: {formatRub(ticketPrice)} + от{' '}
                      {formatRub(budgetBadge.combo.mealMin)} = {formatRub(budgetBadge.combo.total)} (на{' '}
                      {formatRub(budgetBadge.combo.delta)} больше бюджета - можно поесть в другом месте)
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {data.ticket_url && (
            <Button
              type="button"
              onClick={() => {
                void trackMetric('ticket_click', 'event', data.id)
                window.open(data.ticket_url!, '_blank', 'noopener,noreferrer')
              }}
            >
              <Ticket className="h-4 w-4" aria-hidden />
              Купить билет
            </Button>
          )}

          {data.description && (
            <section>
              <h2 className="mb-1 text-sm font-semibold text-muted-foreground">Описание</h2>
              <p className="whitespace-pre-line text-sm leading-relaxed">{data.description}</p>
            </section>
          )}

          {data.place && (
            <section>
              <h2 className="mb-2 text-sm font-semibold text-muted-foreground">Место проведения</h2>
              <Link to={`/places/${data.place.id}`} className="block">
                <Card className="overflow-hidden hover:border-primary/40 transition-colors">
                  <CardContent className="p-3">
                    <div className="font-medium">{data.place.name}</div>
                    <div className="text-sm text-muted-foreground">{data.place.address}</div>
                  </CardContent>
                </Card>
              </Link>

              <div className="mt-3">
                <ExternalActions
                  placeId={data.place.id}
                  eventId={data.id}
                  address={data.place.address}
                />
              </div>
            </section>
          )}
        </div>
      </div>
    </article>
  )
}
