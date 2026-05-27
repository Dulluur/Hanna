import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { fetchEvents, type EventQuery } from '@/api/events'
import type { EventListItem } from '@/api/types'
import { useBudgetStore } from '@/store/budget'
import { EventCard } from '@/components/EventCard'
import { CardSkeletonList } from '@/components/CardSkeleton'
import { EventsFilters } from '@/components/EventsFilters'


export function EventsPage() {
  const [searchParams] = useSearchParams()
  const budget = useBudgetStore((s) => s.budget)

  const query: EventQuery = {
    event_type: searchParams.get('event_type') ?? undefined,
    age_group: searchParams.get('age_group') ?? undefined,
    search: searchParams.get('search') ?? undefined,
    limit: 100,
  }


  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['events', searchParams.toString()],
    queryFn: () => fetchEvents(query),
  })



  const { items, upsell } = useMemo(() => {
    if (!data) {
      return {
        items: [] as EventListItem[],
        upsell: [] as { event: EventListItem; deltaPct: number; deltaRub: number }[],
      }
    }
    if (budget == null) {
      return { items: data.items, upsell: [] }
    }
    const upper = budget * 1.2
    const itemsOut: EventListItem[] = []
    const upsellOut: { event: EventListItem; deltaPct: number; deltaRub: number }[] = []
    for (const event of data.items) {
      const price = event.price ?? 0
      if (price <= budget) {
        itemsOut.push(event)
      } else if (price <= upper) {
        const deltaRub = price - budget
        const deltaPct = Math.round((deltaRub / budget) * 100)
        upsellOut.push({ event, deltaPct, deltaRub })
      }
    }
    return { items: itemsOut, upsell: upsellOut }
  }, [data, budget])

  return (
    <div className="space-y-4">
      <EventsFilters />

      {isLoading ? (
        <CardSkeletonList count={3} />
      ) : isError ? (
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
          Не удалось загрузить афишу: {(error as Error).message}
        </div>
      ) : !data ? null : (
        <>
          <section>
            <div className="mb-2 flex items-baseline justify-between">
              <h2 className="text-base font-semibold">События</h2>
              <span className="text-sm text-muted-foreground">{items.length}</span>
            </div>
            {items.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {budget != null
                  ? 'Под бюджет ничего не нашлось. Попробуйте увеличить его или сбросить фильтры.'
                  : 'Под выбранные фильтры ничего не нашлось.'}
              </p>
            ) : (
              <ul className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
                {items.map((event) => (
                  <li key={event.id}>
                    <EventCard event={event} />
                  </li>
                ))}
              </ul>
            )}
          </section>

          {upsell.length > 0 && (
            <section>
              <h2 className="mb-2 text-base font-semibold">Чуть дороже, но стоит того</h2>
              <ul className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
                {upsell.map(({ event, deltaPct, deltaRub }) => (
                  <li key={event.id}>
                    <EventCard event={event} upsell={{ deltaPct, deltaRub }} />
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  )
}
