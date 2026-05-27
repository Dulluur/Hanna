import { trackMetric } from '@/api/metrics'
import { MapPin, Car } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'


interface Props{
  placeId: number
  eventId?: number | null
  address: string
  latitude: string | number
  longitude: string | number
}


export function ExternalActions({placeId, eventId = null, address, latitude, longitude}: Props){
  const [toast, setToast] = useState<string | null>(null)

  const dgisUrl = `https://2gis.ru/routeSearch/rsType/car/to/${longitude}%2C${latitude}`

  async function onRouteClick(){
    if (eventId != null) {
      void trackMetric('route_click', 'event', eventId)
    } else {
      void trackMetric('route_click', 'place', placeId)
    }
    window.open(dgisUrl, '_blank', 'noopener, noreferrer')
  }

  async function onTaxiClick(){
    if (eventId != null) {
      void trackMetric('taxi_click', 'event', eventId)
    } else {
      void trackMetric('taxi_click', 'place', placeId)
    }
    try{
      await navigator.clipboard.writeText(address)
      setToast('Адрес скопирован — откройте приложение inDrive и вставьте')
    }catch{
      setToast(`Скопируйте адрес вручную: ${address}`)
    }
    setTimeout(() => setToast(null), 4000)
  }


  return(
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <Button type="button" onClick={onRouteClick} variant="default">
          <MapPin className='h-4 w-4' aria-hidden/>
          Маршрут в 2ГИС
        </Button>
        <Button type="button" onClick={onTaxiClick} variant="outline">
          <Car className="h-4 w-4" aria-hidden/>
            Вызвать inDrive
        </Button>
      </div>
      {toast && (
        <div
          role='status'
          className='rounded-md bg-foreground/90 px-3 py-2 text-sm text-background'
          >
            {toast}
          </div>
      )}
    </div>
  )
}

