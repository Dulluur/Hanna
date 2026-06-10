import { useCallback, useEffect, useRef, useState } from 'react'
import type { MouseEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useFavoritesStore } from '@/store/favorites'

const DOUBLE_CLICK_MS = 250

export function useDoubleTapLike(
  kind: 'place' | 'event',
  id: number,
  to: string,
) {
  const navigate = useNavigate()
  const isFav = useFavoritesStore((s) =>
    kind === 'place' ? s.isPlaceFavorite(id) : s.isEventFavorite(id),
  )
  const toggle = useFavoritesStore((s) =>
    kind === 'place' ? s.togglePlace : s.toggleEvent,
  )

  const timer = useRef<number | null>(null)
  const [burst, setBurst] = useState(false)


  useEffect(
    () => () => {
      if (timer.current != null) window.clearTimeout(timer.current)
    },
    [],
  )

  const onClick = useCallback(
    (e: MouseEvent) => {
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) {
        return
      }
      e.preventDefault()

      if (timer.current != null) {
        window.clearTimeout(timer.current)
        timer.current = null
        toggle(id)
        if (!isFav) setBurst(true)
        return
      }

      timer.current = window.setTimeout(() => {
        timer.current = null
        navigate(to)
      }, DOUBLE_CLICK_MS)
    },
    [isFav, toggle, id, navigate, to],
  )

  const onBurstEnd = useCallback(() => setBurst(false), [])

  return { onClick, burst, onBurstEnd }
}
