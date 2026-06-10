import { useId, useRef, useState } from 'react'
import { ImagePlus, Trash2 } from 'lucide-react'
import { IMAGE_ACCEPT, uploadImageFile } from '@/lib/image'
import { Button } from '@/components/ui/button'


interface Props {
  value: string | null
  onChange: (url: string) => void
  label?: string
  previewClassName?: string
}


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
    setUploading(true)
    try {
      const url = await uploadImageFile(file)
      onChange(url)
    } catch (e) {
      const detail = (
        e as { response?: { data?: { detail?: string } } } | null
      )?.response?.data?.detail
      setError(detail ?? (e as Error)?.message ?? 'Не удалось загрузить файл')
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
            accept={IMAGE_ACCEPT}
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
