export interface CategoryRead{
  code: string
  name: string
}


export interface CuisineRead{
  code: string
  name: string
}


export interface DietTagRead{
  code: string
  name: string
}


export interface AmenityTagRead{
  code: string
  name: string
}


export interface PriceBandRead{
  code: string
  name: string
  min_price: number
  max_price: number
}


export interface EventTypeRead{
  code: string
  name: string
}


export interface AgeGroupRead{
  code: string
  name: string
}


export interface PlaceTopDishRead{
  id: number
  name: string
  price: number
  description: string | null
  sort_order: number
  photo_url: string | null
  weight: string | null
  tags: string[]
}


export interface PlaceListItem{
  id: number
  name: string
  address: string
  latitude: string
  longitude: string
  photo_url: string | null
  rating_2gis: string | null
  category: CategoryRead | null
  price_band: PriceBandRead | null
  cuisines: CuisineRead[]
}


export interface PlaceDetail extends PlaceListItem{
  description: string | null
  work_hours: Record<string, unknown> | string | null
  phone: string | null
  website: string | null
  upsell_highlights: string[]
  diet_tags: DietTagRead[]
  amenities: AmenityTagRead[]
  top_dishes: PlaceTopDishRead[]
  is_active: boolean
  created_at: string
  updated_at: string
}


export interface UpsellItem{
  place: PlaceListItem
  delta_pct: number
  delta_rub: number
  reasons: string[]
}


export interface PlaceListResponse{
  items: PlaceListItem[]
  upsell: UpsellItem[]
  total: number
  limit: number
  offset: number
}


export interface EventListItem{
  id: number
  title: string
  photo_url: string | null
  price: number | null
  starts_at: string
  ends_at: string | null
  ticket_url: string | null
  event_type: EventTypeRead | null
  age_group: AgeGroupRead | null
  place: PlaceListItem | null
}


export interface EventDetail extends EventListItem{
  description: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}


export interface CurrentUser{
  id: number
  email: string
  name: string
  role: 'admin' | 'partner'
  place_id: number | null
}
