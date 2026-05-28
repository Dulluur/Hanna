import {create} from 'zustand'
import {persist} from 'zustand/middleware'


interface DietTagsState {
  defaultTags: string[]
  setDefaultTags: (tags: string[]) => void
  clearDefaultTags: () => void
}

export const useDietTagsStore = create<DietTagsState>()(
  persist(
    (set) => ({
      defaultTags: [],
      setDefaultTags: (tags) => set({defaultTags: tags}),
      clearDefaultTags: () => set({defaultTags: []}),
    }),
    {name:'hanna-diet-tags'}
  )
)
