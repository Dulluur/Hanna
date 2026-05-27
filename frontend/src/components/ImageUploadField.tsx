import { useId, useRef, useState } from 'react'
import { ImagePlus, Trash2 } from 'lucide-react'
import heic2any from 'heic2any'
import { uploadImage } from '@/api/partner'
import { Button } from '@/components/ui/button'


async function maybeConvertHeic(file: File): Promise<File> {
  const name = file.name.toLowerCase()
  const isHeic =
    file.type === 'image/heic' ||
    file.type === 'image/heif' ||
    name.endsWith('.heic') ||
    name.endsWith('.heif')
  if (!isHeic) return file

  const converted = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.9 })
  const blob = Array.isArray(converted) ? converted[0] : converted
  const newName = file.name.replace(/\.(heic|heif)$/i, '.jpg')
  return new File([blob], newName, { type: 'image/jpeg' })
}


interface Props {
  value: string | null
  onChange: (url: string) => void
  label?: string
  previewClassName?: string
}


const MAX_BYTES = 5 * 1024 * 1024


export function ImageUploadField({
  value,
  onChange,
  label = 'Фото',
  previewClassName = 'h-24 w-24',
}: Props) {
  const inputId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleFile(file: File) {
    setError(null)
    if (file.size > MAX_BYTES) {
      setError(`Файл слишком большой — максимум ${MAX_BYTES / (1024 * 1024)} МБ`)
      return
    }
    setUploading(true)
    try {
      const prepared = await maybeConvertHeic(file)
      const url = await uploadImage(prepared)
      onChange(url)
    } catch (e) {
      const detail = (
        e as { response?: { data?: { detail?: string } } } | null
      )?.response?.data?.detail
      setError(detail ?? 'Не удалось загрузить файл')
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }


  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">{label}</p>

      {value ? (
        <div className="flex items-start gap-3">
          <img
            src={value}
            alt=""
            className={`rounded-md object-cover ${previewClassName}`}
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onChange('')}
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden />
            Убрать фото
          </Button>
        </div>
      ) : (
        <div>
          <label
            htmlFor={inputId}
            className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-input bg-background px-3 py-1.5 text-sm font-medium hover:bg-accent"
          >
            <ImagePlus className="h-3.5 w-3.5" aria-hidden />
            {uploading ? 'Загрузка…' : 'Загрузить фото'}
          </label>
          <input
            ref={inputRef}
            id={inputId}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif"
            disabled={uploading}
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) handleFile(file)
            }}
            className="hidden"
          />
          <p className="mt-1 text-xs text-muted-foreground">
            JPEG, PNG, WEBP или HEIC (с iPhone), до 5 МБ
          </p>
        </div>
      )}

      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}
