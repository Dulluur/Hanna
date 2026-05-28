import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Save, Trash2 } from 'lucide-react'
import {
  createDish,
  deleteDish,
  fetchMyDishes,
  updateDish,
  type DishCreate,
} from '@/api/partner'
import type { PlaceTopDishRead } from '@/api/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { ImagePlaceholder } from '@/components/ImagePlaceholder'
import { ImageUploadField } from '@/components/ImageUploadField'
import { MultiChips } from '@/components/FilterChips'
import { formatRub } from '@/lib/format'


const DISH_TAG_OPTIONS: readonly { code: string; name: string }[] = [
  { code: 'хит', name: 'Хит' },
  { code: 'новинка', name: 'Новинка' },
  { code: 'острое', name: 'Острое' },
  { code: 'веганское', name: 'Веганское' },
  { code: 'вегетарианское', name: 'Вегетарианское' },
  { code: 'без глютена', name: 'Без глютена' },
  { code: 'сезонное', name: 'Сезонное' },
  { code: 'авторское', name: 'Авторское' },
  { code: 'детское', name: 'Детское' },
]


function dishTagOptionsFor(existing: readonly string[]): { code: string; name: string }[] {
  const opts = [...DISH_TAG_OPTIONS]
  for (const tag of existing) {
    if (!opts.find((o) => o.code === tag)) {
      opts.push({ code: tag, name: tag })
    }
  }
  return opts
}


export function DishesPage() {
  const queryClient = useQueryClient()
  const { data: dishes, isLoading } = useQuery({
    queryKey: ['my-dishes'],
    queryFn: fetchMyDishes,
  })


  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ['my-dishes'] })
  }

  if (isLoading) {
    return <Skeleton className="h-64 w-full" />
  }

  const list = dishes ?? []


  return (
    <div className="space-y-4">
      <header className="flex items-baseline justify-between">
        <h2 className="text-lg font-semibold">Меню</h2>
        <span className="text-sm text-muted-foreground">{list.length} позиций</span>
      </header>

      <NewDishForm onCreated={invalidate} />

      {list.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Блюд пока нет. Добавьте первое через форму выше.
        </p>
      ) : (
        <ul className="space-y-2">
          {list.map((dish) => (
            <li key={dish.id}>
              <DishRow dish={dish} onChanged={invalidate} />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}


interface DishDraft {
  name: string
  // Цену держим строкой, а не числом: иначе при очистке поля пустая строка
  // превращается в Number('') === 0, и поле «прыгает» обратно на ноль -
  // ввести своё значение становится невозможно. В число переводим только
  // при отправке (Number(draft.price)).
  price: string
  description: string
  weight: string
  photo_url: string
  tags: string[]
}


const EMPTY_DRAFT: DishDraft = {
  name: '',
  price: '',
  description: '',
  weight: '',
  photo_url: '',
  tags: [],
}


function NewDishForm({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState<DishDraft>(EMPTY_DRAFT)

  const mutation = useMutation({
    mutationFn: () => {
      const payload: DishCreate = {
        name: draft.name,
        price: Number(draft.price),
        description: draft.description || null,
        weight: draft.weight || null,
        photo_url: draft.photo_url || null,
        tags: draft.tags,
      }
      return createDish(payload)
    },
    onSuccess: () => {
      setDraft(EMPTY_DRAFT)
      setOpen(false)
      onCreated()
    },
  })


  if (!open) {
    return (
      <Button type="button" variant="outline" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" aria-hidden />
        Добавить блюдо
      </Button>
    )
  }


  return (
    <Card>
      <CardContent className="p-3">
        <form
          className="space-y-2"
          onSubmit={(e) => {
            e.preventDefault()
            mutation.mutate()
          }}
        >
          <div className="grid gap-3 sm:grid-cols-[2fr_1fr]">
            <FormField label="Название">
              <input
                required
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </FormField>
            <FormField label="Цена, ₽">
              <input
                required
                type="number"
                min={0}
                value={draft.price}
                onChange={(e) => setDraft({ ...draft, price: e.target.value })}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </FormField>
          </div>
          <FormField label="Описание">
            <textarea
              value={draft.description}
              onChange={(e) => setDraft({ ...draft, description: e.target.value })}
              rows={2}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </FormField>
          <FormField label="Вес или объём">
            <input
              placeholder="350 г / 0.5 л"
              value={draft.weight}
              onChange={(e) => setDraft({ ...draft, weight: e.target.value })}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </FormField>

          <ImageUploadField
            label="Фото блюда"
            value={draft.photo_url}
            onChange={(url) => setDraft({ ...draft, photo_url: url })}
          />
          <FormField label="Метки на карточке блюда">
            <MultiChips
              label="Метки блюда"
              options={dishTagOptionsFor(draft.tags)}
              selected={draft.tags}
              onChange={(next) => setDraft({ ...draft, tags: next })}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Эти плашки рисуются на карточке блюда (как на маркетплейсах).
              На фильтрацию списка заведений они не влияют - для этого есть
              теги диет на странице «Информация».
            </p>
          </FormField>
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
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setOpen(false)}
            >
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


function DishRow({
  dish,
  onChanged,
}: {
  dish: PlaceTopDishRead
  onChanged: () => void
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<DishDraft>({
    name: dish.name,
    price: String(dish.price),
    description: dish.description ?? '',
    weight: dish.weight ?? '',
    photo_url: dish.photo_url ?? '',
    tags: dish.tags,
  })


  const updateMutation = useMutation({
    mutationFn: () =>
      updateDish(dish.id, {
        name: draft.name,
        price: Number(draft.price),
        description: draft.description || null,
        weight: draft.weight || null,
        photo_url: draft.photo_url || null,
        tags: draft.tags,
      }),
    onSuccess: () => {
      setEditing(false)
      onChanged()
    },
  })


  const deleteMutation = useMutation({
    mutationFn: () => deleteDish(dish.id),
    onSuccess: onChanged,
  })


  if (!editing) {
    return (
      <Card>
        <CardContent className="flex items-start justify-between gap-3 p-3">
          {/*
            Превью фото слева - 64×64 квадрат. Если фото нет, рендерим
            ImagePlaceholder (тот же, что и для мест без обложки), чтобы
            не было визуального "провала" в строке.
          */}
          <div className="h-16 w-16 shrink-0 overflow-hidden rounded-md bg-muted">
            {dish.photo_url ? (
              <img
                src={dish.photo_url}
                alt={dish.name}
                className="h-full w-full object-cover"
                loading="lazy"
              />
            ) : (
              <ImagePlaceholder seed={dish.name} alt={dish.name} className="h-full w-full" />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium">{dish.name}</span>
              <span className="rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">
                {formatRub(dish.price)}
              </span>
              {dish.weight && (
                <span className="text-xs text-muted-foreground">{dish.weight}</span>
              )}
            </div>
            {dish.description && (
              <p className="mt-1 text-sm text-muted-foreground">{dish.description}</p>
            )}
            {dish.tags.length > 0 && (
              <div className="mt-1.5 flex flex-wrap gap-1">
                {dish.tags.map((t) => (
                  <Badge key={t} variant="secondary">
                    {t}
                  </Badge>
                ))}
              </div>
            )}
          </div>
          <div className="flex gap-1">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setEditing(true)}
            >
              Изменить
            </Button>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              aria-label="Удалить блюдо"
              onClick={() => {
                if (confirm(`Удалить блюдо «${dish.name}»?`)) {
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
          className="space-y-2"
          onSubmit={(e) => {
            e.preventDefault()
            updateMutation.mutate()
          }}
        >
          <div className="grid gap-3 sm:grid-cols-[2fr_1fr]">
            <FormField label="Название">
              <input
                required
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </FormField>
            <FormField label="Цена, ₽">
              <input
                required
                type="number"
                min={0}
                value={draft.price}
                onChange={(e) => setDraft({ ...draft, price: e.target.value })}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </FormField>
          </div>
          <FormField label="Описание">
            <textarea
              value={draft.description}
              onChange={(e) => setDraft({ ...draft, description: e.target.value })}
              rows={2}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </FormField>
          <FormField label="Вес или объём">
            <input
              placeholder="350 г / 0.5 л"
              value={draft.weight}
              onChange={(e) => setDraft({ ...draft, weight: e.target.value })}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </FormField>

          <ImageUploadField
            label="Фото блюда"
            value={draft.photo_url}
            onChange={(url) => setDraft({ ...draft, photo_url: url })}
          />
          <FormField label="Метки на карточке блюда">
            <MultiChips
              label="Метки блюда"
              options={dishTagOptionsFor(draft.tags)}
              selected={draft.tags}
              onChange={(next) => setDraft({ ...draft, tags: next })}
            />
          </FormField>
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={updateMutation.isPending}>
              <Save className="h-3.5 w-3.5" aria-hidden />
              Сохранить
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setEditing(false)}
            >
              Отмена
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
