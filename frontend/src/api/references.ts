import { api } from './client';


import type{
  AgeGroupRead,
  AmenityTagRead,
  CategoryRead,
  CuisineRead,
  DietTagRead,
  EventTypeRead,
  PriceBandRead,
} from './types'


export interface ReferencesBundle{
  categories: CategoryRead[]
  cuisines: CuisineRead[]
  diet_tags: DietTagRead[]
  amenities: AmenityTagRead[]
  event_types: EventTypeRead[]
  age_groups: AgeGroupRead[]
  price_bands: PriceBandRead[]
}


export async function fetchReferences(): Promise<ReferencesBundle>{
  const {data} = await api.get<ReferencesBundle>('/api/references')
  return data
}
