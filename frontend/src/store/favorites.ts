import {create} from 'zustand'
import {persist} from 'zustand/middleware'


interface FavoritesState{
  placeIds: number[]
  eventIds: number[]
  togglePlace: (id: number) => void
  toggleEvent: (id: number) => void
  isPlaceFavorite: (id: number) => boolean
  isEventFavorite: (id: number) => boolean
  clear:() => void
}


function toggle(arr: number[], id: number): number[]{
  return arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id]
}


export const userFavoritesStore = create<FavoritesState>()(
  persist(
    (set, get) => ({
      placeIds: [],
      eventIds: [],
      togglePlace: (id) => set({ placeIds: toggle(get().placeIds, id)}),
      toggleEvent: (id) => set({ eventIds: toggle(get().eventIds, id)}),
      isPlaceFavorite: (id) => get().placeIds.includes(id),
      isEventFavorite: (id) => get().eventIds.includes(id),
      clear: () => set({placeIds: [], eventIds: []}),
    }),
    {name: 'hanna-favorites'},
  )
)
