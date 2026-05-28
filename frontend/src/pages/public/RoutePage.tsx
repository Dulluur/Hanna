import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { Copy, Share2, Trash2 } from 'lucide-react'
import { fetchEvents } from '@/api/events'
import { fetchPlaces } from '@/api/places'
import { useFavoritesStore } from '@/store/favorites'
import { CardSkeletonList } from '@/components/CardSkeleton'
import { EventCard } from '@/components/EventCard'
import { PlaceCard } from '@/components/PlaceCard'
import { Button } from '@/components/ui/button'


export function RoutePage() {
  const [searchParams] = useSearchParams()
  const sharedPlaces = parseIds(searchParams.get('p'))
  const sharedEvents = parseIds(searchParams.get('e'))
  const isSharedView = sharedPlaces.length > 0 || sharedEvents.length > 0


  const ownPlaceIds = useFavoritesStore((s) => s.placeIds)
  const ownEventIds = useFavoritesStore((s) => s.eventIds)
  const togglePlace = useFavoritesStore((s) => s.togglePlace)
  const toggleEvent = useFavoritesStore((s) => s.toggleEvent)
  const clearAll = useFavoritesStore((s) => s.clear)

  const placeIds = isSharedView ? sharedPlaces : ownPlaceIds
  const eventIds = isSharedView ? sharedEvents : ownEventIds


  const placesQuery = useQuery({
    queryKey: ['places', 'route-source'],
    queryFn: () => fetchPlaces({ limit: 100 }),
    enabled: placeIds.length > 0,
  })
  const eventsQuery = useQuery({
    queryKey: ['events', 'route-source'],
    queryFn: () => fetchEvents({ limit: 100 }),
    enabled: eventIds.length > 0,
  })


  const routePlaces =
    placesQuery.data?.items.filter((p) => placeIds.includes(p.id)) ?? []
  const routeEvents =
    eventsQuery.data?.items.filter((e) => eventIds.includes(e.id)) ?? []


  if (placeIds.length === 0 && eventIds.length === 0) {
    return (
      <div className="rounded-lg border bg-card p-6 text-center text-sm text-muted-foreground">
        {isSharedView
          ? 'Ссылка пустая — в маршруте нет ни одной точки.'
          : 'Маршрут пуст. Добавляйте заведения и события сердечком на карточке.'}
      </div>
    )
  }


  return (
    <div className="space-y-6">
      {isSharedView ? (
        <SharedHeader
          placeCount={placeIds.length}
          eventCount={eventIds.length}
          onImport={() => importSharedRoute(placeIds, eventIds, ownPlaceIds, ownEventIds, togglePlace, toggleEvent)}
        />
      ) : (
        <OwnHeader
          placeIds={ownPlaceIds}
          eventIds={ownEventIds}
          onClear={clearAll}
        />
      )}

      {placeIds.length > 0 && (
        <section>
          <div className="mb-2 flex items-baseline justify-between">
            <h2 className="text-base font-semibold">Заведения</h2>
            <span className="text-sm text-muted-foreground">{placeIds.length}</span>
          </div>
          {placesQuery.isLoading ? (
            <CardSkeletonList count={Math.min(placeIds.length, 3)} />
          ) : routePlaces.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Заведения из маршрута больше не доступны.
            </p>
          ) : (
            <ul className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
              {routePlaces.map((place) => (
                <li key={place.id}>
                  <PlaceCard place={place} />
                </li>
              ))}
            </ul>
          )}
        </section>
      )}


      {eventIds.length > 0 && (
        <section>
          <div className="mb-2 flex items-baseline justify-between">
            <h2 className="text-base font-semibold">События</h2>
            <span className="text-sm text-muted-foreground">{eventIds.length}</span>
          </div>
          {eventsQuery.isLoading ? (
            <CardSkeletonList count={Math.min(eventIds.length, 3)} />
          ) : routeEvents.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              События из маршрута больше не доступны.
            </p>
          ) : (
            <ul className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
              {routeEvents.map((event) => (
                <li key={event.id}>
                  <EventCard event={event} />
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {(placesQuery.isError || eventsQuery.isError) && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
          Не удалось загрузить часть маршрута. Попробуйте обновить страницу.
        </div>
      )}
    </div>
  )
}


function parseIds(raw: string | null): number[] {
  if (!raw) return []
  return raw
    .split(',')
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isInteger(n) && n > 0)
}


function OwnHeader({
  placeIds,
  eventIds,
  onClear,
}: {
  placeIds: number[]
  eventIds: number[]
  onClear: () => void
}) {
  const shareText = 'Мой маршрут на вечер в Якутске'
  const shareUrl = buildShareUrl(placeIds, eventIds)

  const [copied, setCopied] = useState(false)

  async function handleNativeShare() {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: 'Маршрут — Hanna',
          text: shareText,
          url: shareUrl,
        })
      } catch {
        // Пользователь отменил диалог - это не ошибка, ничего не делаем.
      }
    } else {
      await handleCopy()
    }
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      // Сбрасываем индикатор через 2с, чтобы пользователь успел увидеть.
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // На очень старых браузерах clipboard может быть недоступен - в этом случае пользователь сам скопирует из адресной строки.
    }
  }


  return (
    <div>
      <div className="mb-3">
        <h2 className="text-xl font-semibold">Мой маршрут</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Поделитесь подборкой друзьям ссылкой - они откроют её в браузере и
          увидят те же карточки.
        </p>
      </div>

      <div className="space-y-2 rounded-lg border bg-card p-4">
        <p className="text-xs font-semibold uppercase text-muted-foreground">
          Поделиться маршрутом
        </p>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="default"
            size="sm"
            onClick={handleNativeShare}
          >
            <Share2 className="h-3.5 w-3.5" aria-hidden />
            Поделиться
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleCopy}
          >
            <Copy className="h-3.5 w-3.5" aria-hidden />
            {copied ? 'Скопировано' : 'Скопировать ссылку'}
          </Button>
        </div>
      </div>

      <div className="mt-3">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => {
            if (window.confirm('Очистить маршрут? Действие необратимо.')) {
              onClear()
            }
          }}
        >
          <Trash2 className="h-3.5 w-3.5" aria-hidden />
          Очистить маршрут
        </Button>
      </div>
    </div>
  )
}


function SharedHeader(props: {
  placeCount: number
  eventCount: number
  onImport: () => void
}) {
  const [imported, setImported] = useState(false)

  function handleImport() {
    props.onImport()
    setImported(true)
  }

  return (
    <div>
      <div className="rounded-lg border border-primary/30 bg-primary/[0.05] p-4">
        <p className="text-xs font-semibold uppercase text-primary">
          Маршрут по ссылке
        </p>
        <p className="mt-1 text-sm">
          В подборке {props.placeCount} заведений и {props.eventCount} событий.
        </p>
        <p className="mt-2 text-xs text-muted-foreground">
          Этот маршрут открыт через ссылку - он не сохранён у вас. Можно
          добавить его в свой маршрут, чтобы вернуться позже.
        </p>
        <div className="mt-3">
          <Button
            type="button"
            variant="default"
            size="sm"
            onClick={handleImport}
            disabled={imported}
          >
            {imported ? 'Добавлено в мой маршрут' : 'Добавить в мой маршрут'}
          </Button>
        </div>
      </div>
    </div>
  )
}


function buildShareUrl(placeIds: number[], eventIds: number[]): string {
  const base = `${window.location.origin}/route`
  const params = new URLSearchParams()
  if (placeIds.length > 0) params.set('p', placeIds.join(','))
  if (eventIds.length > 0) params.set('e', eventIds.join(','))
  const qs = params.toString()
  return qs ? `${base}?${qs}` : base
}


function importSharedRoute(
  sharedPlaces: number[],
  sharedEvents: number[],
  ownPlaces: number[],
  ownEvents: number[],
  togglePlace: (id: number) => void,
  toggleEvent: (id: number) => void,
) {
  for (const id of sharedPlaces) {
    if (!ownPlaces.includes(id)) togglePlace(id)
  }
  for (const id of sharedEvents) {
    if (!ownEvents.includes(id)) toggleEvent(id)
  }
}
