import { fetchReferences } from '@/api/references';
import { useSingleParam } from '@/lib/url-state';
import { useQuery } from '@tanstack/react-query';
import { Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton'
import { SingleChips } from '@/components/FilterChips'


export function EventsFilters(){
  const {data, isLoading} = useQuery({
    queryKey: ['references'],
    queryFn: fetchReferences,
    staleTime: 5 * 60_000,
  })


  const [eventType, setEventType] = useSingleParam('event_type')
  const [ageGroup, setAgeGroup] = useSingleParam('age_group')
  const [search, setSearch] = useSingleParam('search')

  const hasAnyFilter = eventType != null || ageGroup != null || (search ?? '').length > 0


  function resetAll(){
    setEventType(null)
    setAgeGroup(null)
    setSearch(null)
  }


  if(isLoading || !data){
    return (
      <div className="space-y-2">
        <Skeleton className="h-9 w-full"/>
        <Skeleton className="h-8 w-3/4"/>
      </div>
    )
  }


  return(
    <div className="space-y-3">
      <div className="relative">
        <Search
          className='absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground' aria-hidden
          />
          <input
            type='search'
            placeholder='Поиск по названию'
            value={search ?? ''}
            onChange={(e) => setSearch(e.target.value || null)}
            className='w-full rounded-md border bg-background pl-9 pr-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring'
            />
      </div>
      <details className='rounded-md border bg-card'>
        <summary className='cursor-pointer select-none px-3 py-2 text-sm font-medium'>
          Фильтры
          {hasAnyFilter && (
            <span className="ml-2 rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">
              активны
            </span>
          )}
        </summary>

          <div className="space-y-3 border-t p-3">
            {data.event_types.length > 0 && (
              <section>
                <h3 className="mb-1 text-xs font-semibold uppercase text-muted-foreground">
                  Тип события
                </h3>
                <SingleChips
                  options={data.event_types}
                  selected={eventType}
                  onChange={setEventType}
                  label="Тип события"
                  />
              </section>
            )}


          {data.age_groups.length > 0 &&(
            <section>
              <h3 className="mb-1 text-xs font-semibold uppercase text-muted-foreground">
                Возраст
              </h3>
              <SingleChips
                options={data.age_groups}
                selected={ageGroup}
                onChange={setAgeGroup}
                label="Возрастная группа"
              />
            </section>
          )}


          {hasAnyFilter && (
            <Button type='button' variant='ghost' size='sm' onClick={resetAll}>
              <X className='h-3.5 w-3.5' aria-hidden/>
              Сбросить все фильтры
            </Button>
          )}
          </div>
      </details>
    </div>
  )
}
