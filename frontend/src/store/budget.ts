import {create} from 'zustand'
import {persist} from 'zustand/middleware'


interface BudgetState {
  budget: number | null
  setBudget: (value: number | null) => void
  clearBudget: () => void
}


export const useBudgetStore = create<BudgetState>()(
  persist(
    (set) => ({
      budget: null,
      setBudget: (value) => set({budget: value}),
      clearBudget: () => set({budget: null}),
    }),
    {name: 'hanna-budget'}
  ),
)
