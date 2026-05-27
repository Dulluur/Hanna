import { useCallback } from 'react';
import {useSearchParams} from 'react-router-dom'


export function useMultiParam(name: string): [string[], (next: string[]) =>
void] {
  const [searchParams, setSearchParams] = useSearchParams()
  const values = searchParams.getAll(name)


  const setValues = useCallback(
    (next: string[]) => {
      setSearchParams(
        (prev) => {
          const params = new URLSearchParams(prev)
          params.delete(name)
          for(const v of next) params.append(name, v)
          return params
        },
      {replace: true},
      )
    },
    [name, setSearchParams]
  )
  return [values, setValues]
  }


export function useSingleParam(name: string): [string | null, (next: string | null) => void]{
  const [searchParams, setSearchParams] = useSearchParams()
  const value = searchParams.get(name)

  const setValue = useCallback(
    (next: string | null) => {
      setSearchParams(
        (prev) => {
          const params = new URLSearchParams(prev)
          if (next == null || next === ''){
            params.delete(name)
          }else{
            params.set(name, next)
          }
          return params
        },
        {replace: true},
      )
    },
    [name, setSearchParams],
  )
  return [value, setValue]
}


export function toggleArrayValue<T>(arr: readonly T[], value: T): T[]{
  return arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value]
}
