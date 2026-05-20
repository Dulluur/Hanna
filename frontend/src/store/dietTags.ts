import {create} from 'zustand'
import {persist} from 'zustand/middleware'

interface DietTagsState {
  defaultTags: string[]
  setDedaultTags: (tags: string[]) => void
  clearDefaultTags: () => void
}

export const userDietTagsStore = create<DietTagsState>()(
  persist(
    (set) => ({
      defaultTags: [],
      setDedaultTags: (tags) => set({defaultTags: tags}),
      clearDefaultTags: () => set({defaultTags: []}),
    }),
    {name:'hanna-diet-tags'}
  )
)
