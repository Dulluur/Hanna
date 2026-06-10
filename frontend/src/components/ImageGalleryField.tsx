import { useId, useRef, useState } from 'react'
import { ImagePlus, X } from 'lucide-react'
import { IMAGE_ACCEPT, uploadImageFile } from '@/lib/image'


interface Props {
  value: string[]
  onChange: (urls: string[]) => void
  label?: string
  hint?: string
  max?: number
}


export function ImageGalleryField({
  value,
  onChange,
  label = 'Дополнительные фото',
  hint = 'Можно выбрать сразу несколько. JPEG, PNG, WEBP или HEIC, до 5 МБ каждое.',
  max = 12,
}: Props) {
  const inputId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const reachedMax = value.length >= max

  async function handleFiles(files: FileList) {
    setError(null)
    setUploading(true)
    const slots = max - value.length
    const chosen = Array.from(files).slice(0, slots)
    const uploaded: string[] = []
    try {
      for (const file of chosen) {
        uploaded.push(await uploadImageFile(file))
      }
    } catch (e) {
      const detail = (
        e as { response?: { data?: { detail?: string } } } | null
      )?.response?.data?.detail
      setError(detail ?? (e as Error)?.message ?? 'Не удалось загрузить часть фото')
    } finally {
      if (uploaded.length) onChange([...value, ...uploaded])
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  function removeAt(index: number) {
    onChange(value.filter((_, i) => i !== index))
  }

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">{label}</p>

      {value.length > 0 && (
        <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {value.map((url, i) => (
            <li key={url} className="relative">
              <img
                src={url}
                alt=""
                className="aspect-square w-full rounded-md object-cover"
              />
              <button
                type="button"
                aria-label="Удалить фото"
                onClick={() => removeAt(i)}
                className="absolute right-1 top-1 inline-flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {!reachedMax && (
        <div>
          <label
            htmlFor={inputId}
            className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-input bg-background px-3 py-1.5 text-sm font-medium hover:bg-accent"
          >
            <ImagePlus className="h-3.5 w-3.5" aria-hidden />
            {uploading ? 'Загрузка…' : 'Добавить фото'}
          </label>
          <input
            ref={inputRef}
            id={inputId}
            type="file"
            multiple
            accept={IMAGE_ACCEPT}
            disabled={uploading}
            onChange={(e) => {
              const files = e.target.files
              if (files && files.length) handleFiles(files)
            }}
            className="hidden"
          />
          <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
        </div>
      )}

      {reachedMax && (
        <p className="text-xs text-muted-foreground">
          Достигнут лимит в {max} фото — удалите лишние, чтобы добавить новые.
        </p>
      )}

      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}
