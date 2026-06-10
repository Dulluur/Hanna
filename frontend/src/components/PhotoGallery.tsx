import { useRef, useState } from 'react'
import { ImagePlaceholder } from '@/components/ImagePlaceholder'
import { cn } from '@/lib/utils'


interface Props {
  images: string[]
  alt: string
  seed: string
  className?: string
}


export function PhotoGallery({ images, alt, seed, className }: Props) {
  const [active, setActive] = useState(0)
  const scrollerRef = useRef<HTMLDivElement>(null)

  if (images.length === 0) {
    return (
      <ImagePlaceholder
        seed={seed}
        alt={alt}
        className={cn('aspect-[16/9] w-full rounded-lg', className)}
      />
    )
  }

  function handleScroll() {
    const el = scrollerRef.current
    if (!el || el.clientWidth === 0) return
    const i = Math.round(el.scrollLeft / el.clientWidth)
    setActive(Math.max(0, Math.min(i, images.length - 1)))
  }

  function goTo(i: number) {
    const el = scrollerRef.current
    if (el) el.scrollTo({ left: i * el.clientWidth, behavior: 'smooth' })
    setActive(i)
  }

  return (
    <div className={cn('space-y-2', className)}>
      <div
        ref={scrollerRef}
        onScroll={handleScroll}
        className="flex snap-x snap-mandatory overflow-x-auto rounded-lg [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {images.map((url) => (
          <img
            key={url}
            src={url}
            alt={alt}
            className="aspect-[16/9] w-full shrink-0 snap-start object-cover"
          />
        ))}
      </div>

      {images.length > 1 && (
        <ul className="flex gap-2 overflow-x-auto p-1">
          {images.map((url, i) => (
            <li key={url} className="shrink-0">
              <button
                type="button"
                aria-label={`Фото ${i + 1}`}
                aria-current={i === active}
                onClick={() => goTo(i)}
                className={cn(
                  'block overflow-hidden rounded-md ring-2 transition',
                  i === active
                    ? 'ring-primary'
                    : 'ring-transparent hover:ring-primary/40',
                )}
              >
                <img
                  src={url}
                  alt=""
                  className="h-16 w-20 object-cover"
                  loading="lazy"
                />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
