import {api} from './client'

export type MetricAction = 'route_click' | 'taxi_click' | 'ticket_click'

export async function trackMetric(
  action: MetricAction,
  placeId: number | null,
  eventId: number | null = null,
): Promise<void>{
  try{
    await api.post('/api/metrics',{
      action,
      place_id: placeId,
      event_id: eventId,
    })
  } catch{
    //глотаем - метрика не критична
  }
}
