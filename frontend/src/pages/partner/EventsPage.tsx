import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CalendarDays, Plus, Save, Trash2 } from 'lucide-react'
import {
  createEvent,
  deleteEvent,
  fetchMyEvents,
  updateEvent,
  type EventCreate,
} from '@/api/partner'
import { fetchReferences } from '@/api/references'
import type { EventDetail } from '@/api/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { ImageGalleryField } from '@/components/ImageGalleryField'
import { ImageUploadField } from '@/components/ImageUploadField'
import { formatEventStart, formatRub, normalizeUrl } from '@/lib/format'


export function PartnerEventsPage() {
  const queryClient = useQueryClient()

  const { data: events, isLoading } = useQuery({
    queryKey: ['my-events'],
    queryFn: fetchMyEvents,
  })
  const { data: refs } = useQuery({
    queryKey: ['references'],
    queryFn: fetchReferences,
    staleTime: 5 * 60_000,
  })

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ['my-events'] })
  }

  if (isLoading) {
    return <Skeleton className="h-64 w-full" />
  }

  const list = events ?? []

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">События</h2>

      <NewEventForm refs={refs} onCreated={invalidate} />

      {list.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Событий пока нет. Добавьте первое через форму выше.
        </p>
      ) : (
        <ul className="space-y-2">
          {list.map((event) => (
            <li key={event.id}>
              <EventRow event={event} refs={refs} onChanged={invalidate} />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}


interface RefsBundle {
  event_types: { code: string; name: string }[]
  age_groups: { code: string; name: string }[]
}


function toIso(local: string): string {
  return new Date(local).toISOString()
}


function toLocal(iso: string | null | undefined): string {
  if (!iso) return ''
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}


function NewEventForm({
  refs,
  onCreated,
}: {
  refs: RefsBundle | undefined
  onCreated: () => void
}) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState({
    title: '',
    description: '',
    event_type: '',
    age_group: '',
    price: '',
    starts_at: '',
    ends_at: '',
    ticket_url: '',
    photo_url: '',
    photos: [] as string[],
  })


  const mutation = useMutation({
    mutationFn: () => {
      const payload: EventCreate = {
        title: draft.title,
        description: draft.description || null,
        event_type: draft.event_type || null,
        age_group: draft.age_group || null,
        price: draft.price === '' ? null : Number(draft.price),
        starts_at: toIso(draft.starts_at),
        ends_at: draft.ends_at ? toIso(draft.ends_at) : null,
        ticket_url: normalizeUrl(draft.ticket_url),
        photo_url: draft.photo_url || null,
        photos: draft.photos,
      }
      return createEvent(payload)
    },
    onSuccess: () => {
      setOpen(false)
      onCreated()
    },
  })


  if (!open) {
    return (
      <Button type="button" variant="outline" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" aria-hidden />
        Добавить событие
      </Button>
    )
  }


  return (
    <Card>
      <CardContent className="p-3">
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault()
            mutation.mutate()
          }}
        >
          <FormField label="Название">
            <input
              required
              value={draft.title}
              onChange={(e) => setDraft({ ...draft, title: e.target.value })}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </FormField>
          <FormField label="Описание">
            <textarea
              value={draft.description}
              onChange={(e) => setDraft({ ...draft, description: e.target.value })}
              rows={2}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </FormField>
          <div className="grid gap-3 sm:grid-cols-2">
            <FormField label="Начало">
              <input
                required
                type="datetime-local"
                value={draft.starts_at}
                onChange={(e) => setDraft({ ...draft, starts_at: e.target.value })}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </FormField>
            <FormField label="Окончание">
              <input
                type="datetime-local"
                value={draft.ends_at}
                onChange={(e) => setDraft({ ...draft, ends_at: e.target.value })}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </FormField>
          </div>
          <FormField label="Цена, ₽ (пусто = бесплатно)">
            <input
              type="number"
              min={0}
              value={draft.price}
              onChange={(e) => setDraft({ ...draft, price: e.target.value })}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </FormField>
          <div className="grid gap-3 sm:grid-cols-2">
            <FormField label="Тип события">
              <select
                value={draft.event_type}
                onChange={(e) => setDraft({ ...draft, event_type: e.target.value })}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="">- не выбрано -</option>
                {refs?.event_types.map((t) => (
                  <option key={t.code} value={t.code}>
                    {t.name}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label="Возрастная категория">
              <select
                value={draft.age_group}
                onChange={(e) => setDraft({ ...draft, age_group: e.target.value })}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="">- не выбрано -</option>
                {refs?.age_groups.map((a) => (
                  <option key={a.code} value={a.code}>
                    {a.name}
                  </option>
                ))}
              </select>
            </FormField>
          </div>
          <FormField label="Ссылка на покупку билета">
            <input
              type="text"
              placeholder="example.com/tickets - можно без https://"
              value={draft.ticket_url}
              onChange={(e) => setDraft({ ...draft, ticket_url: e.target.value })}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </FormField>

          <ImageUploadField
            label="Фото события (обложка)"
            value={draft.photo_url}
            onChange={(url) => setDraft({ ...draft, photo_url: url })}
          />

          <ImageGalleryField
            value={draft.photos}
            onChange={(urls) => setDraft({ ...draft, photos: urls })}
          />

          {mutation.isError && (
            <p className="text-xs text-destructive">
              Не удалось сохранить: {(mutation.error as Error).message}
            </p>
          )}

          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={mutation.isPending}>
              <Save className="h-3.5 w-3.5" aria-hidden />
              Сохранить
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)}>
              Отмена
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}


function FormField({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium">{label}</span>
      {children}
    </label>
  )
}


function EventRow({
  event,
  refs,
  onChanged,
}: {
  event: EventDetail
  refs: RefsBundle | undefined
  onChanged: () => void
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState({
    title: event.title,
    description: event.description ?? '',
    starts_at: toLocal(event.starts_at),
    ends_at: toLocal(event.ends_at),
    price: event.price == null ? '' : String(event.price),
    event_type: event.event_type?.code ?? '',
    age_group: event.age_group?.code ?? '',
    ticket_url: event.ticket_url ?? '',
    photo_url: event.photo_url ?? '',
    photos: event.photos ?? [],
  })


  const updateMutation = useMutation({
    mutationFn: () =>
      updateEvent(event.id, {
        title: draft.title,
        description: draft.description || null,
        starts_at: toIso(draft.starts_at),
        ends_at: draft.ends_at ? toIso(draft.ends_at) : null,
        price: draft.price === '' ? null : Number(draft.price),
        event_type: draft.event_type || null,
        age_group: draft.age_group || null,
        ticket_url: normalizeUrl(draft.ticket_url),
        photo_url: draft.photo_url || null,
        photos: draft.photos,
      }),
    onSuccess: () => {
      setEditing(false)
      onChanged()
    },
  })


  const deleteMutation = useMutation({
    mutationFn: () => deleteEvent(event.id),
    onSuccess: onChanged,
  })


  if (!editing) {
    return (
      <Card>
        <CardContent className="flex items-start justify-between gap-3 p-3">
          <div className="min-w-0">
            <div className="font-medium">{event.title}</div>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <CalendarDays className="h-3.5 w-3.5" aria-hidden />
                {formatEventStart(event.starts_at)}
              </span>
              <span>
                {event.price == null || event.price === 0
                  ? 'Бесплатно'
                  : formatRub(event.price)}
              </span>
            </div>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {event.event_type && <Badge variant="outline">{event.event_type.name}</Badge>}
              {event.age_group && <Badge variant="outline">{event.age_group.name}</Badge>}
            </div>
          </div>
          <div className="flex gap-1">
            <Button type="button" size="sm" variant="ghost" onClick={() => setEditing(true)}>
              Изменить
            </Button>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              aria-label="Удалить событие"
              onClick={() => {
                if (confirm(`Удалить событие «${event.title}»?`)) {
                  deleteMutation.mutate()
                }
              }}
              disabled={deleteMutation.isPending}
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }


  return (
    <Card>
      <CardContent className="p-3">
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault()
            updateMutation.mutate()
          }}
        >
          <FormField label="Название">
            <input
              required
              value={draft.title}
              onChange={(e) => setDraft({ ...draft, title: e.target.value })}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </FormField>
          <FormField label="Описание">
            <textarea
              value={draft.description}
              onChange={(e) => setDraft({ ...draft, description: e.target.value })}
              rows={2}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </FormField>
          <div className="grid gap-3 sm:grid-cols-2">
            <FormField label="Начало">
              <input
                required
                type="datetime-local"
                value={draft.starts_at}
                onChange={(e) => setDraft({ ...draft, starts_at: e.target.value })}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </FormField>
            <FormField label="Окончание">
              <input
                type="datetime-local"
                value={draft.ends_at}
                onChange={(e) => setDraft({ ...draft, ends_at: e.target.value })}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </FormField>
          </div>
          <FormField label="Цена, ₽ (пусто = бесплатно)">
            <input
              type="number"
              min={0}
              value={draft.price}
              onChange={(e) => setDraft({ ...draft, price: e.target.value })}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </FormField>
          <div className="grid gap-3 sm:grid-cols-2">
            <FormField label="Тип события">
              <select
                value={draft.event_type}
                onChange={(e) => setDraft({ ...draft, event_type: e.target.value })}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="">- не выбрано -</option>
                {refs?.event_types.map((t) => (
                  <option key={t.code} value={t.code}>
                    {t.name}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label="Возрастная категория">
              <select
                value={draft.age_group}
                onChange={(e) => setDraft({ ...draft, age_group: e.target.value })}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="">- не выбрано -</option>
                {refs?.age_groups.map((a) => (
                  <option key={a.code} value={a.code}>
                    {a.name}
                  </option>
                ))}
              </select>
            </FormField>
          </div>
          <FormField label="Ссылка на покупку билета">
            <input
              type="text"
              placeholder="example.com/tickets - можно без https://"
              value={draft.ticket_url}
              onChange={(e) => setDraft({ ...draft, ticket_url: e.target.value })}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </FormField>

          <ImageUploadField
            label="Фото события (обложка)"
            value={draft.photo_url}
            onChange={(url) => setDraft({ ...draft, photo_url: url })}
          />

          <ImageGalleryField
            value={draft.photos}
            onChange={(urls) => setDraft({ ...draft, photos: urls })}
          />
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={updateMutation.isPending}>
              <Save className="h-3.5 w-3.5" aria-hidden />
              Сохранить
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setEditing(false)}>
              Отмена
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
