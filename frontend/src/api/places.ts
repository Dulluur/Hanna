import {api} from './client'
import type { PlaceDetail, PlaceListResponse } from './types'


export interface PlaceQuery{
  category?: string
  cuisines?: string[]
  diet_tags?: string[]
  amenities?: string[]
  price_band?: string
  budget?: number
  search?: string
  limit?: number
  offset?: number
}


export async function fetchPlaces(query: PlaceQuery = {}):
Promise<PlaceListResponse> {
  const {data} = await api.get<PlaceListResponse>('/api/places',{
    params: query,
    paramsSerializer: { indexes: null}
  })
  return data
}


export async function fetchPlace(id: number): Promise<PlaceDetail>{
  const {data} = await api.get<PlaceDetail>(`/api/places/${id}`)
  return data
}
