import { api } from './client'


export type MetricAction =
  | 'route_click'
  | 'taxi_click'
  | 'ticket_click'
  | 'phone_click'
  | 'website_click'


export type EntityType = 'place' | 'event'


export async function trackMetric(
  action: MetricAction,
  entityType: EntityType,
  entityId: number,
): Promise<void> {
  try {
    await api.post('/api/metrics', {
      entity_type: entityType,
      entity_id: entityId,
      action,
    })
  } catch (err) {
    if (import.meta.env.DEV) {
      console.warn('[trackMetric] failed', err)
    }
  }
}
