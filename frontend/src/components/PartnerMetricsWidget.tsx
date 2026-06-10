import { useQuery } from '@tanstack/react-query'
import { Car, Globe, Navigation, Phone, Ticket } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { fetchPartnerMetrics } from '@/api/partner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'


const TILES: { action: string; label: string; icon: LucideIcon }[] = [
  { action: 'route_click', label: 'Маршруты', icon: Navigation },
  { action: 'taxi_click', label: 'Такси', icon: Car },
  { action: 'ticket_click', label: 'Билеты', icon: Ticket },
  { action: 'phone_click', label: 'Звонки', icon: Phone },
  { action: 'website_click', label: 'Сайт', icon: Globe },
]


export function PartnerMetricsWidget() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['my-metrics'],
    queryFn: fetchPartnerMetrics,
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Статистика за 30 дней</CardTitle>
        <p className="text-xs text-muted-foreground">
          Действия гостей с вашей карточкой и событиями
        </p>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-20 w-full" />
        ) : isError ? (
          <p className="text-sm text-muted-foreground">
            Не удалось загрузить статистику.
          </p>
        ) : (
          <>
            <ul className="grid grid-cols-3 gap-3 sm:grid-cols-5">
              {TILES.map(({ action, label, icon: Icon }) => (
                <li
                  key={action}
                  className="flex flex-col items-center gap-1 rounded-lg border p-3 text-center"
                >
                  <Icon className="h-4 w-4 text-muted-foreground" aria-hidden />
                  <span className="text-xl font-semibold tabular-nums">
                    {data?.actions[action] ?? 0}
                  </span>
                  <span className="text-xs text-muted-foreground">{label}</span>
                </li>
              ))}
            </ul>
            {data && data.total === 0 && (
              <p className="mt-3 text-xs text-muted-foreground">
                Пока нет данных — цифры появятся, когда гости начнут открывать
                маршрут, вызывать такси и т.п. с вашей карточки.
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
