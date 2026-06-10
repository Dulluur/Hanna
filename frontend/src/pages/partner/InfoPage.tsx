import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Save } from 'lucide-react'
import { fetchMyPlace, updateMyPlace, type PlaceUpdate } from '@/api/partner'
import { fetchReferences } from '@/api/references'
import { MultiChips } from '@/components/FilterChips'
import { HighlightsField } from '@/components/HighlightsField'
import { ImageGalleryField } from '@/components/ImageGalleryField'
import { ImageUploadField } from '@/components/ImageUploadField'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { normalizeUrl } from '@/lib/format'


export function InfoPage() {
  const queryClient = useQueryClient()
  const { data: place, isLoading } = useQuery({
    queryKey: ['my-place'],
    queryFn: fetchMyPlace,
  })
  const { data: refs } = useQuery({
    queryKey: ['references'],
    queryFn: fetchReferences,
    staleTime: 5 * 60_000,
  })

  const [draft, setDraft] = useState<PlaceUpdate>({})
  const [savedAt, setSavedAt] = useState<number | null>(null)


  useEffect(() => {
    if (place) {
      setDraft({
        description: place.description ?? '',
        photo_url: place.photo_url ?? '',
        photos: place.photos ?? [],
        phone: place.phone ?? '',
        website: place.website ?? '',
        upsell_highlights: place.upsell_highlights ?? [],
        cuisines: place.cuisines.map((c) => c.code),
        diet_tags: place.diet_tags.map((d) => d.code),
        amenities: place.amenities.map((a) => a.code),
      })
    }
  }, [place])


  const mutation = useMutation({
    mutationFn: () =>
      updateMyPlace({
        ...draft,
        // Дописываем https:// если пользователь ввёл сайт без протокола.
        website: normalizeUrl(draft.website as string | null | undefined),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-place'] })
      setSavedAt(Date.now())
    },
  })

  if (isLoading || !place) {
    return <Skeleton className="h-96 w-full" />
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Информация о заведении</h2>

      <Card>
        <CardContent className="space-y-2 p-4 text-sm">
          <p className="text-xs uppercase text-muted-foreground">
            Эти поля меняет администратор
          </p>
          <div className="grid gap-1 sm:grid-cols-2">
            <Readonly label="Название" value={place.name} />
            <Readonly label="Адрес" value={place.address} />
            <Readonly label="Категория" value={place.category?.name ?? '-'} />
            <Readonly
              label="Ценовой сегмент"
              value={
                place.price_band
                  ? `${place.price_band.min_price}–${place.price_band.max_price} ₽`
                  : '-'
              }
            />
          </div>
        </CardContent>
      </Card>

      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault()
          mutation.mutate()
        }}
      >
        <Field label="Описание">
          <textarea
            rows={4}
            value={(draft.description as string) ?? ''}
            onChange={(e) => setDraft({ ...draft, description: e.target.value })}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </Field>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Телефон">
            <input
              type="tel"
              value={(draft.phone as string) ?? ''}
              onChange={(e) => setDraft({ ...draft, phone: e.target.value })}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </Field>
          <Field label="Сайт" hint="Можно без https:// - допишем сами">
            <input
              type="text"
              value={(draft.website as string) ?? ''}
              onChange={(e) => setDraft({ ...draft, website: e.target.value })}
              placeholder="example.com"
              className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </Field>
        </div>

        <ImageUploadField
          label="Фото заведения (обложка)"
          value={(draft.photo_url as string) ?? ''}
          onChange={(url) => setDraft({ ...draft, photo_url: url })}
          previewClassName="aspect-[16/9] w-full max-w-md"
        />

        <ImageGalleryField
          label="Дополнительные фото"
          value={draft.photos ?? []}
          onChange={(urls) => setDraft({ ...draft, photos: urls })}
        />

        <div className="block">
          <span className="mb-1 block text-sm font-medium">Фишки заведения</span>
          <HighlightsField
            value={draft.upsell_highlights ?? []}
            onChange={(next) => setDraft({ ...draft, upsell_highlights: next })}
          />
        </div>

        {refs && (
          <>
            <Field label="Кухни">
              <MultiChips
                label="Кухни"
                options={refs.cuisines}
                selected={draft.cuisines ?? []}
                onChange={(next) => setDraft({ ...draft, cuisines: next })}
              />
            </Field>
            <Field label="Диетические опции">
              <MultiChips
                label="Диетические опции"
                options={refs.diet_tags}
                selected={draft.diet_tags ?? []}
                onChange={(next) => setDraft({ ...draft, diet_tags: next })}
              />
            </Field>
            <Field label="Удобства">
              <MultiChips
                label="Удобства"
                options={refs.amenities}
                selected={draft.amenities ?? []}
                onChange={(next) => setDraft({ ...draft, amenities: next })}
              />
            </Field>
          </>
        )}

        {mutation.isError && (
          <p className="text-xs text-destructive">
            Не удалось сохранить: {(mutation.error as Error).message}
          </p>
        )}

        <div className="flex items-center gap-3">
          <Button type="submit" disabled={mutation.isPending}>
            <Save className="h-4 w-4" aria-hidden />
            Сохранить
          </Button>
          {savedAt && !mutation.isPending && (
            <span className="text-xs text-muted-foreground">
              Сохранено в {new Date(savedAt).toLocaleTimeString('ru-RU')}
            </span>
          )}
        </div>
      </form>
    </div>
  )
}


function Field({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-muted-foreground">{hint}</span>}
    </label>
  )
}


function Readonly({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs uppercase text-muted-foreground">{label}</div>
      <div className="font-medium">{value}</div>
    </div>
  )
}
