import {api} from './client'
import type { EventDetail, PlaceDetail, PlaceTopDishRead } from './types'


export async function fetchMyPlace(): Promise<PlaceDetail> {
  const{data} = await api.get<PlaceDetail>('/api/partner/place/me')
  return data
}


export interface PlaceUpdate{
  description?: string | null
  work_hours?: Record<string, unknown> | string | null
  photo_url?: string | null
  phone?: string | null
  website?: string | null
  upsell_highlights?: string[] | null
  cuisines?: string[] | null
  diet_tags?: string[] | null
  amenities?: string[] | null
}


export async function updateMyPlace(payload: PlaceUpdate): Promise<PlaceDetail>{
  const {data} = await api.put<PlaceDetail>('/api/partner/place/me', payload)
  return data
}


export interface DishCreate{
  name: string
  price: number
  description?: string | null
  sort_order?: number
  weight?: string | null
  photo_url?: string | null
  tags?: string[]
}


export interface DishUpdate{
  name?: string
  price?: number
  description?: string | null
  sort_order?: number
  weight?: string | null
  photo_url?: string | null
  tags?: string[]
}


export async function fetchMyDishes(): Promise<PlaceTopDishRead[]> {
  const {data} = await api.get<PlaceTopDishRead[]>('/api/partner/dishes')
  return data
}


export async function createDish(payload: DishCreate):
Promise<PlaceTopDishRead>{
  const {data} = await api.post<PlaceTopDishRead>('/api/partner/dishes', payload)
  return data
}


export async function updateDish(id: number, payload: DishUpdate):
Promise<PlaceTopDishRead>{
  const {data} = await api.put<PlaceTopDishRead>(`/api/partner/dishes/${id}`, payload)
  return data
}


export async function deleteDish(id:number): Promise<void>{
  await api.delete(`/api/partner/dishes/${id}`)
}


export interface ImageUploadResponse{
  url: string
}


export async function uploadImage(file: File): Promise<string>{
  const form = new FormData()
  form.append('file', file)
  const {data} = await api.post<ImageUploadResponse>(
    '/api/partner/uploads/image',
    form,
    {headers:{'Content-Type': 'multipart/form-data'}},
  )
  return data.url
}


export interface EventCreate{
  title: string
  description?: string | null
  event_type?: string | null
  age_group?: string | null
  price?: number | null
  starts_at: string
  ends_at?: string | null
  ticket_url?: string | null
  photo_url?: string | null
}


export interface EventUpdate{
  title?: string
  description?: string | null
  event_type?: string | null
  age_group?: string | null
  price?: number | null
  starts_at?: string
  ends_at?: string | null
  ticket_url?: string | null
  photo_url?: string | null
  is_active?: boolean
}


export async function fetchMyEvents(): Promise<EventDetail[]> {
  const {data} = await api.get<EventDetail[]>('/api/partner/events')
  return data
}

export async function createEvent(payload: EventCreate): Promise<EventDetail>{
  const {data} = await api.post<EventDetail>('/api/partner/events', payload)
  return data
}

export async function updateEvent(id: number, payload: EventUpdate):
Promise<EventDetail>{
  const {data} = await api.put<EventDetail>(`/api/partner/events/${id}`, payload)
  return data
}

export async function deleteEvent(id: number): Promise<void>{
  await api.delete(`/api/partner/events/${id}`)
}
