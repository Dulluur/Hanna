import { api } from './client';
import type { EventDetail, EventListItem } from './types';


export interface EventQuery{
  event_type?: string
  age_group?: string
  date_from?: string
  date_to?: string
  price_max?: number
  place_id?: number
  search?: string
  limit?: number
  offset?: number
}


export interface EventListResponse{
  items: EventListItem[]
  total: number
  limit: number
  offset: number
}


export async function fetchEvents(query: EventQuery = {}):
Promise<EventListResponse>{
  const {data} = await api.get<EventListResponse>('/api/events',{
    params: query,
  })
  return data
}


export async function fetchEvent(id: number): Promise<EventDetail>{
  const {data} = await api.get<EventDetail>(`/api/events/${id}`)
  return data
}

