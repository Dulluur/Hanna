import { useEffect, useRef, useState } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { Calendar, Locate, UtensilsCrossed, X } from 'lucide-react'
import { fetchPlace, fetchPlaces } from '@/api/places'
import { fetchEvents } from '@/api/events'
import type { EventListItem, PlaceDetail, PlaceListItem } from '@/api/types'
import { formatEventStart } from '@/lib/format'
import { cn } from '@/lib/utils'


const YAKUTSK_CENTER: [number, number] = [129.73, 62.0282]
const USER_LOCATION_ZOOM = 16


const MAP_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  sources: {
    'osm-raster': {
      type: 'raster',
      tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
      tileSize: 256,
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>',
      maxzoom: 19,
    },
  },
  layers: [
    {
      id: 'osm-tiles',
      type: 'raster',
      source: 'osm-raster',
      minzoom: 0,
      maxzoom: 19,
    },
  ],
}


const FORK_ICON = renderToStaticMarkup(
  <UtensilsCrossed size={18} color="white" strokeWidth={2.5} />,
)


const CALENDAR_ICON = renderToStaticMarkup(
  <Calendar size={18} color="white" strokeWidth={2.5} />,
)


function buildIconMarker(kind: 'food' | 'event'): HTMLDivElement {
  const wrapper = document.createElement('div')
  wrapper.style.cursor = 'pointer'

  const isFood = kind === 'food'
  wrapper.innerHTML = `
    <div class="flex h-9 w-9 items-center justify-center rounded-full ${isFood ? 'bg-orange-500' : 'bg-violet-600'} shadow-lg ring-2 ring-white">
      ${isFood ? FORK_ICON : CALENDAR_ICON}
    </div>
  `
  return wrapper
}


function formatWorkHours(wh: PlaceDetail['work_hours']): string | null {
  if (!wh) return null
  if (typeof wh === 'string') return wh
  const parts: string[] = []
  for (const [day, hours] of Object.entries(wh)) {
    if (typeof hours === 'string') parts.push(`${day}: ${hours}`)
  }
  return parts.length ? parts.join(', ') : null
}

type Selected =
  | { type: 'place'; data: PlaceListItem }
  | { type: 'event'; data: EventListItem }


export function MapPage() {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const userMarkerRef = useRef<maplibregl.Marker | null>(null)
  const markersRef = useRef<maplibregl.Marker[]>([])
  const navigate = useNavigate()

  const [mapReady, setMapReady] = useState(false)
  const [showFood, setShowFood] = useState(true)
  const [showEvents, setShowEvents] = useState(true)
  const [mapError] = useState<string | null>(null)
  const [geoMessage, setGeoMessage] = useState<string | null>(null)
  const [geoLoading, setGeoLoading] = useState(false)
  const [selected, setSelected] = useState<Selected | null>(null)

  const { data: placesData } = useQuery({
    queryKey: ['places-for-map'],
    queryFn: () => fetchPlaces({ limit: 100 }),
  })
  const { data: eventsData } = useQuery({
    queryKey: ['events-for-map'],
    queryFn: () => fetchEvents({ limit: 100 }),
  })


  const selectedPlaceId =
    selected?.type === 'place' ? selected.data.id : null
  const { data: selectedPlaceDetail } = useQuery({
    queryKey: ['place-detail', selectedPlaceId],
    queryFn: () => fetchPlace(selectedPlaceId!),
    enabled: selectedPlaceId !== null,
  })


  useEffect(() => {
    if (!containerRef.current) return

    let cancelled = false


    const map = new maplibregl.Map({
      container: containerRef.current,
      style: MAP_STYLE,
      center: YAKUTSK_CENTER,
      zoom: 12,
    })


    map.addControl(
      new maplibregl.NavigationControl({ showCompass: false }),
      'top-right',
    )


    requestAnimationFrame(() => map.resize())


    map.on('load', () => {
      if (cancelled) return


      const style = map.getStyle()
      if (style) {
        for (const layer of style.layers) {
          if (layer.type !== 'symbol') continue
          const layout = layer.layout
          if (!layout || !('text-field' in layout)) continue


          map.setLayoutProperty(layer.id, 'text-field', [
            'coalesce',
            ['get', 'name:ru'],
            ['get', 'name'],
          ])
        }
      }


      mapRef.current = map
      setMapReady(true)
    })


    map.on('error', (e) => {
      console.error('MapLibre error:', e)
    })

    return () => {
      cancelled = true
      map.remove()
      mapRef.current = null
      markersRef.current = []
      userMarkerRef.current = null
    }
  }, [])


  useEffect(() => {
    if (!mapReady) return
    const map = mapRef.current
    if (!map) return


    for (const m of markersRef.current) {
      m.remove()
    }
    markersRef.current = []


    if (showFood && placesData) {
      for (const place of placesData.items) {
        const lon = Number(place.longitude)
        const lat = Number(place.latitude)
        if (!Number.isFinite(lon) || !Number.isFinite(lat)) continue

        const element = buildIconMarker('food')
        element.addEventListener('click', () => {
          setSelected({ type: 'place', data: place })
        })


        const marker = new maplibregl.Marker({ element })
          .setLngLat([lon, lat])
          .addTo(map)

        markersRef.current.push(marker)
      }
    }

    if (showEvents && eventsData) {
      for (const event of eventsData.items) {
        if (!event.place) continue
        const lon = Number(event.place.longitude)
        const lat = Number(event.place.latitude)
        if (!Number.isFinite(lon) || !Number.isFinite(lat)) continue

        const element = buildIconMarker('event')
        element.addEventListener('click', () => {
          setSelected({ type: 'event', data: event })
        })

        const marker = new maplibregl.Marker({ element })
          .setLngLat([lon, lat])
          .addTo(map)

        markersRef.current.push(marker)
      }
    }
  }, [mapReady, placesData, eventsData, showFood, showEvents])


  const handleWhereAmI = () => {
    if (!navigator.geolocation) {
      setGeoMessage('Геолокация не поддерживается этим браузером')
      return
    }
    setGeoLoading(true)
    setGeoMessage(null)


    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords
        const map = mapRef.current
        if (!map) {
          setGeoLoading(false)
          return
        }


        map.flyTo({
          center: [longitude, latitude],
          zoom: USER_LOCATION_ZOOM,
          duration: 800,
        })


        if (userMarkerRef.current) {
          userMarkerRef.current.setLngLat([longitude, latitude])
        } else {
          const dot = document.createElement('div')
          dot.innerHTML =
            '<div class="h-4 w-4 rounded-full bg-blue-500 border-2 border-white shadow-[0_0_0_2px_rgba(59,130,246,0.3)]"></div>'

          userMarkerRef.current = new maplibregl.Marker({ element: dot })
            .setLngLat([longitude, latitude])
            .addTo(map)
        }
        setGeoLoading(false)
      },
      (err) => {
        setGeoLoading(false)
        if (err.code === err.PERMISSION_DENIED) {
          setGeoMessage('Доступ к геолокации запрещён в настройках браузера')
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          setGeoMessage('Не удалось определить местоположение')
        } else {
          setGeoMessage('Время ожидания геолокации истекло')
        }
      },
      { enableHighAccuracy: true, timeout: 10000 },
    )
  }


  return (
    <div className="fixed inset-x-0 top-14 bottom-16 md:bottom-0 z-0">
      <div
        ref={containerRef}
        className="absolute inset-0 bg-muted"
        style={{ width: '100%', height: '100%', minHeight: '400px' }}
      />


      <div className="absolute left-3 bottom-3 z-10 flex flex-row gap-2">
        <FilterChip
          active={showFood}
          onClick={() => setShowFood((v) => !v)}
          icon={<UtensilsCrossed className="h-4 w-4" />}
          label="Еда"
          activeClass="bg-orange-500 text-white border-orange-500"
        />
        <FilterChip
          active={showEvents}
          onClick={() => setShowEvents((v) => !v)}
          icon={<Calendar className="h-4 w-4" />}
          label="Афиша"
          activeClass="bg-violet-600 text-white border-violet-600"
        />
      </div>


      <button
        type="button"
        onClick={handleWhereAmI}
        disabled={geoLoading}
        className="absolute bottom-3 right-3 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-white text-foreground shadow-lg border hover:bg-muted disabled:opacity-60 disabled:cursor-not-allowed"
        aria-label="Где я"
        title="Показать моё местоположение"
      >
        <Locate className={geoLoading ? 'h-5 w-5 animate-pulse' : 'h-5 w-5'} />
      </button>


      {geoMessage && (
        <div className="absolute top-3 left-1/2 z-30 -translate-x-1/2 max-w-xs rounded-md bg-destructive px-3 py-2 text-xs text-destructive-foreground shadow-lg">
          {geoMessage}
        </div>
      )}


      {selected && (
        <SelectedCard
          selected={selected}
          placeDetail={selectedPlaceDetail ?? null}
          onClose={() => setSelected(null)}
          onOpenDetail={() => {
            const path =
              selected.type === 'place'
                ? `/places/${selected.data.id}`
                : `/events/${selected.data.id}`
            navigate(path)
          }}
        />
      )}

      {mapError && (
        <div className="absolute top-3 left-1/2 z-10 -translate-x-1/2 rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive shadow">
          Не удалось загрузить карту: {mapError}
        </div>
      )}
    </div>
  )
}


function FilterChip(props: {
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  label: string
  activeClass: string
}) {
  return (
    <button
      type="button"
      onClick={props.onClick}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium shadow-md transition-colors',
        props.active
          ? props.activeClass
          : 'bg-white text-foreground border-input hover:bg-muted',
      )}
      aria-pressed={props.active}
    >
      {props.icon}
      <span>{props.label}</span>
    </button>
  )
}


function SelectedCard(props: {
  selected: Selected
  placeDetail: PlaceDetail | null
  onClose: () => void
  onOpenDetail: () => void
}) {
  const { selected } = props


  let title: string
  let subtitle: string | null
  let infoLabel: string
  let infoValue: string | null

  if (selected.type === 'place') {
    title = selected.data.name
    subtitle = selected.data.address
    infoLabel = 'Часы работы'
    infoValue = props.placeDetail
      ? formatWorkHours(props.placeDetail.work_hours)
      : null
  } else {
    title = selected.data.title
    subtitle = selected.data.place ? selected.data.place.name : null
    infoLabel = 'Когда'
    const startStr = formatEventStart(selected.data.starts_at)
    if (selected.data.ends_at) {
      const endTime = new Date(selected.data.ends_at).toLocaleTimeString(
        'ru-RU',
        { hour: '2-digit', minute: '2-digit' },
      )
      infoValue = `${startStr} → ${endTime}`
    } else {
      infoValue = startStr
    }
  }


  return (
    <div className="absolute bottom-20 left-3 right-3 z-20 rounded-lg border bg-background p-4 shadow-xl sm:left-auto sm:right-3 sm:w-96">
      <button
        type="button"
        onClick={props.onClose}
        className="absolute right-2 top-2 rounded-md p-1 text-muted-foreground hover:bg-muted"
        aria-label="Закрыть"
      >
        <X className="h-4 w-4" />
      </button>

      <div className="pr-6">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">
          {selected.type === 'place' ? 'Заведение' : 'Событие'}
        </p>
        <h3 className="mt-0.5 text-base font-semibold leading-tight">
          {title}
        </h3>
        {subtitle && (
          <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>
        )}
      </div>

      <div className="mt-3 rounded-md bg-muted px-3 py-2 text-xs">
        <p className="text-muted-foreground">{infoLabel}</p>
        <p className="mt-0.5 font-medium">
          {infoValue ?? (selected.type === 'place' ? 'Загрузка…' : '—')}
        </p>
      </div>

      <button
        type="button"
        onClick={props.onOpenDetail}
        className="mt-3 w-full rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
      >
        Подробнее
      </button>
    </div>
  )
}
