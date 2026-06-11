import { useQuery } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { fetchPlaces, type PlaceQuery } from '@/api/places'
import { useBudgetStore } from '@/store/budget'
import { PlaceCard } from '@/components/PlaceCard'
import { CardSkeletonList } from '@/components/CardSkeleton'
import { PlacesFilters } from '@/components/PlacesFilters'


export function PlacesPage() {
  const [searchParams] = useSearchParams()
  const budget = useBudgetStore((s) => s.budget)


  const query: PlaceQuery = {
    category: searchParams.get('category') ?? undefined,
    cuisines: searchParams.getAll('cuisines'),
    diet_tags: searchParams.getAll('diet_tags'),
    search: searchParams.get('search') ?? undefined,
    budget: budget ?? undefined,
  }


  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['places', searchParams.toString(), budget],
    queryFn: () => fetchPlaces(query),
  })

  
  return (
    <div className="space-y-4">
      <PlacesFilters />

      {isLoading ? (
        <CardSkeletonList count={4} />
      ) : isError ? (
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
          Не удалось загрузить заведения: {(error as Error).message}
        </div>
      ) : !data ? null : (
        <>
          <section>
            <div className="mb-2 flex items-baseline justify-between">
              <h2 className="text-base font-semibold">Заведения</h2>
              <span className="text-sm text-muted-foreground">{data.total}</span>
            </div>

            {data.items.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Ничего не нашлось. Попробуйте сбросить фильтры или увеличить бюджет.
              </p>
            ) : (
              <ul className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
                {data.items.map((place, index) => (
                  <li key={place.id}>
                    <PlaceCard place={place} priority={index < 3} />
                  </li>
                ))}
              </ul>
            )}
          </section>

          {data.upsell.length > 0 && (
            <section>
              <h2 className="mb-2 text-base font-semibold">Чуть дороже, но стоит того</h2>
              <ul className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
                {data.upsell.map(({ place, delta_pct, delta_rub, reasons }) => (
                  <li key={place.id}>
                    <PlaceCard
                      place={place}
                      upsell={{ deltaPct: delta_pct, deltaRub: delta_rub, reasons }}
                    />
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
