import { useState } from 'react'
import { Plus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'


const SUGGESTIONS = [
  'Авторская кухня',
  'Панорамный вид',
  'Сезонное меню',
  'Местные продукты',
  'Винная карта',
  'Фирменные десерты',
  'Завтраки весь день',
  'Крафтовый кофе',
]

export const HIGHLIGHTS_MAX = 3
const MIN_LEN = 2
const MAX_LEN = 60


interface Props {
  value: string[]
  onChange: (next: string[]) => void
}


export function HighlightsField({ value, onChange }: Props) {
  const [custom, setCustom] = useState('')
  const [error, setError] = useState<string | null>(null)

  const atMax = value.length >= HIGHLIGHTS_MAX
  const has = (s: string) =>
    value.some((v) => v.toLowerCase() === s.toLowerCase())


  function add(raw: string): boolean {
    const s = raw.trim()
    setError(null)
    if (!s) return false
    if (s.length < MIN_LEN) {
      setError(`Слишком коротко - минимум ${MIN_LEN} символа`)
      return false
    }
    if (s.length > MAX_LEN) {
      setError(`Слишком длинно - максимум ${MAX_LEN} символов`)
      return false
    }
    if (has(s)) {
      setError('Такая фишка уже есть')
      return false
    }
    if (atMax) {
      setError(`Можно не больше ${HIGHLIGHTS_MAX} фишек`)
      return false
    }
    onChange([...value, s])
    return true
  }

  function remove(s: string) {
    setError(null)
    onChange(value.filter((v) => v !== s))
  }

  function submitCustom() {
    if (add(custom)) setCustom('')
  }


  const suggestionsToShow = SUGGESTIONS.filter((s) => !has(s))


  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {value.length === 0 && (
          <span className="text-xs text-muted-foreground">
            Пока ничего не выбрано
          </span>
        )}
        {value.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => remove(s)}
            aria-label={`Убрать «${s}»`}
            className="inline-flex items-center gap-1 rounded-full border border-primary bg-primary px-3 py-1 text-xs font-medium text-primary-foreground"
          >
            {s}
            <X className="h-3 w-3" aria-hidden />
          </button>
        ))}
      </div>


      {!atMax && suggestionsToShow.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {suggestionsToShow.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => add(s)}
              className="inline-flex items-center gap-1 rounded-full border border-dashed border-input px-3 py-1 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <Plus className="h-3 w-3" aria-hidden />
              {s}
            </button>
          ))}
        </div>
      )}


      {!atMax && (
        <div className="flex gap-2">
          <input
            type="text"
            value={custom}
            maxLength={MAX_LEN}
            onChange={(e) => setCustom(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                submitCustom()
              }
            }}
            placeholder="Своя фишка"
            className="flex-1 rounded-md border bg-background px-3 py-1.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={submitCustom}
            disabled={!custom.trim()}
          >
            Добавить
          </Button>
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Выбрано {value.length} из {HIGHLIGHTS_MAX}. В каталоге покажем первые 2 -
        они объясняют гостю, почему стоит зайти.
      </p>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}
