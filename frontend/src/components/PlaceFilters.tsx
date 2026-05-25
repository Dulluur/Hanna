import { useEffect, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { Search, X } from 'lucide-react'
import { fetchReferences } from '@/api/references'
import { useDietTagsStore } from '@/store/dietTags'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { MultiChips, SingleChips } from '@/components/FilterChips'
import { useMultiParam, useSingleParam } from '@/lib/url-state'


export function PlacesFilters(){
  const {data, isLoading} = useQuery({
    queryKey: ['references'],
    queryFn: fetchReferences,
    staleTime: 5 * 60_000,
  })

  const [category, setCategory] = useSingleParam('category')
  const [cuisines, setCuisines] = useMultiParam('cuisines')
  const [dietTags, setDietTags] = useMultiParam('diet_tags')
  const [search, setSearch] = useSingleParam('search')

  const defaultDietTags = useDietTagsStore((s) => s.defaultTags)
  const [searchParams] = useSearchParams()
  const didApplyDefaults = useRef(false)
  useEffect(() => {
    if (didApplyDefaults.current) return
    if (defaultDietTags.length === 0) return
    if (searchParams.has('diet_tags')) return
    didApplyDefaults.current = true
    setDietTags(defaultDietTags)
  }, [])

  const hasAnyFilter =
    category != null || cuisines.length > 0 || dietTags.length > 0 || (search ?? '').length > 0

  function resetAll(){
    setCategory(null)
    setCuisines([])
    setDietTags([])
    setSearch(null)
  }

  if(isLoading || !data){
    return(
      <div className="space-y-2">
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-8 w-3/4" />
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search
          className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <input
          type='search'
          placeholder='Поиск по названию или адресу'
          value={search ?? ''}
          onChange={(e) => setSearch(e.target.value || null)}
          className='w-full rounded-md border bg-background pl-9 pr-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring'
        />
      </div>

      <details className='rounded-md border bg-card'>
        <summary className='cursor pointer select-none px-3 py-2 text-sm font-medium'>
          Фильтры
          {hasAnyFilter && (
            <span className='ml-2 rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground'>
              активны
            </span>
          )}
        </summary>

        <div className="space-y-3 border-t p-3">
          {data.categories.length > 0 && (
            <section>
              <h3 className="mb-1 text-xs font-semibold uppercase text-muted-foreground">
                Категория
              </h3>
              <SingleChips
                options={data.categories}
                selected={category}
                onChange={setCategory}
                label='Категория заведения'
                />
            </section>
          )}

          {data.cuisines.length > 0 && (
            <section>
              <h3 className="mb-1 text-xs font-semibold uppercase text-muted-foreground">Кухня</h3>
              <MultiChips
                options={data.cuisines}
                selected={cuisines}
                onChange={setCuisines}
                label='Кухня'
              />
            </section>
          )}

          {data.diet_tags.length > 0 &&(
            <section>
              <h3 className="mb-1 text-xs font-semibold uppercase text-muted-foreground">
                Диета
              </h3>
              <MultiChips
                options={data.diet_tags}
                selected={dietTags}
                onChange={setDietTags}
                label='Диета'
              />
            </section>
          )}

          {hasAnyFilter && (
            <Button type='button' variant='ghost' size="sm" onClick={resetAll}>
              <X className='h-3.5 w-3.5' aria-hidden/>
              Сбросить все фильтры
            </Button>
          )}
        </div>
      </details>
    </div>
  )
}
