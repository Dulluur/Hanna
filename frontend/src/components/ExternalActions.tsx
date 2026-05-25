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
    void trackMetric('route_click', placeId, eventId)
    window.open(dgisUrl, '_blank', 'noopener, noreferrer')
  }

  async function onTaxiClick(){
    void trackMetric('taxi_click', placeId, eventId)
    try{
      await navigator.clipboard.writeText(address)
      setToast('Адрес скопирован, вставьте в inDrive')
    }catch{
      setToast(`Скопируйте адрес вручную: ${address}`)
    }
    window.open('https://indrive.com/', '_blank', 'noopener, noreferrer')
    setTimeout(() => setToast(null), 3000)
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

