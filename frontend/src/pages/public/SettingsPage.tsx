import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { LogIn, Trash2, UserPlus, Wallet } from 'lucide-react'
import { fetchReferences } from '@/api/references'
import { useBudgetStore } from '@/store/budget'
import { useDietTagsStore } from '@/store/dietTags'
import { useFavoritesStore } from '@/store/favorites'
import { MultiChips } from '@/components/FilterChips'
import { Button, buttonVariants } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { formatRub } from '@/lib/format'


export function SettingsPage() {
  const budget = useBudgetStore((s) => s.budget)
  const setBudget = useBudgetStore((s) => s.setBudget)
  const clearBudget = useBudgetStore((s) => s.clearBudget)

  const defaultTags = useDietTagsStore((s) => s.defaultTags)
  const setDefaultTags = useDietTagsStore((s) => s.setDefaultTags)
  const clearDefaultTags = useDietTagsStore((s) => s.clearDefaultTags)

  const clearRoute = useFavoritesStore((s) => s.clear)
  const routeCount = useFavoritesStore(
    (s) => s.placeIds.length + s.eventIds.length,
  )


  const [budgetDraft, setBudgetDraft] = useState<string>(
    budget != null ? String(budget) : '',
  )


  const { data: refs, isLoading: refsLoading } = useQuery({
    queryKey: ['references'],
    queryFn: fetchReferences,
    staleTime: 5 * 60_000,
  })

  function commitBudget() {
    const trimmed = budgetDraft.trim()
    if (trimmed === '') {
      clearBudget()
      return
    }
    const num = Number(trimmed)
    if (Number.isFinite(num) && num >= 0) {
      setBudget(num)
    }
  }

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-xl font-semibold">Настройки</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Эти параметры хранятся только в вашем браузере и не отправляются на сервер.
        </p>
      </header>


      <section className="space-y-2 rounded-lg border bg-card p-4">
        <div className="flex items-center gap-2">
          <Wallet className="h-4 w-4 text-muted-foreground" aria-hidden />
          <h3 className="text-sm font-semibold">Бюджет на вечер</h3>
        </div>
        <p className="text-xs text-muted-foreground">
          Используется фильтром заведений и блоком "чуть дороже" (апселл).
        </p>
        <div className="flex items-center gap-2">
          <input
            type="number"
            inputMode="numeric"
            min={0}
            value={budgetDraft}
            onChange={(e) => setBudgetDraft(e.target.value)}
            onBlur={commitBudget}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitBudget()
            }}
            placeholder="например, 1500"
            className="w-32 rounded-md border bg-background px-3 py-1.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <span className="text-sm text-muted-foreground">₽</span>
          {budget != null && (
            <span className="ml-auto text-xs text-muted-foreground">
              Сейчас: <span className="font-medium text-foreground">{formatRub(budget)}</span>
            </span>
          )}
        </div>
      </section>


      <section className="space-y-3 rounded-lg border bg-card p-4">
        <div>
          <h3 className="text-sm font-semibold">Диет-теги по умолчанию</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Будут запомнены для следующих сессий. При желании можно использовать
            как стартовое значение фильтра на странице "Еда".
          </p>
        </div>


        {refsLoading || !refs ? (
          <Skeleton className="h-8 w-3/4" />
        ) : refs.diet_tags.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            Справочник диет пуст - нечего выбирать.
          </p>
        ) : (
          <MultiChips
            options={refs.diet_tags}
            selected={defaultTags}
            onChange={setDefaultTags}
            label="Диет-теги по умолчанию"
          />
        )}

        {defaultTags.length > 0 && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={clearDefaultTags}
            className="-ml-2"
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden />
            Очистить выбор
          </Button>
        )}
      </section>


      <section className="space-y-2 rounded-lg border bg-card p-4">
        <h3 className="text-sm font-semibold">Маршрут</h3>
        <p className="text-xs text-muted-foreground">
          В маршруте сейчас {routeCount}{' '}
          {routeCount === 1 ? 'элемент' : routeCount >= 2 && routeCount <= 4 ? 'элемента' : 'элементов'}.
        </p>
        {routeCount > 0 && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              if (window.confirm('Очистить маршрут? Действие необратимо.')) {
                clearRoute()
              }
            }}
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden />
            Очистить маршрут
          </Button>
        )}
      </section>


      <section className="space-y-2 rounded-lg border bg-card p-4">
        <h3 className="text-sm font-semibold">Заведение в Hanna</h3>
        <p className="text-xs text-muted-foreground">
          Если вы представитель заведения, войдите в партнёрский кабинет, чтобы
          обновлять топ-блюда, события и описание места. Новые заведения подают
          заявку - администратор подтверждает её, и кабинет становится доступен.
        </p>
        <div className="flex flex-wrap gap-2">
          <Link
            to="/partner/login"
            className={buttonVariants({ variant: 'outline', size: 'sm' })}
          >
            <LogIn className="h-3.5 w-3.5" aria-hidden />
            Войти как партнёр
          </Link>
          <Link
            to="/partner/register"
            className={buttonVariants({ variant: 'default', size: 'sm' })}
          >
            <UserPlus className="h-3.5 w-3.5" aria-hidden />
            Оставить заявку
          </Link>
        </div>
      </section>
    </div>
  )
}
