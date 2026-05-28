import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import{
  CalendarRange,
  Info,
  LayoutDashboard,
  LogOut,
  UtensilsCrossed,
} from 'lucide-react'
import { logout } from '@/api/auth'
import { Button } from '@/components/ui/button'
import { useMe } from '@/lib/auth'
import { cn } from '@/lib/utils'


const nav = [
  {to: '/partner/dashboard', label: 'Обзор', icon: LayoutDashboard},
  {to: '/partner/dishes', label: 'Блюда', icon: UtensilsCrossed},
  {to: '/partner/events', label: 'События', icon: CalendarRange},
  {to: '/partner/info', label: 'Информация', icon: Info},
] as const


export function PartnerLayout(){
  const {data:me} = useMe()
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  const logoutMutation = useMutation({
    mutationFn: logout,
    onSuccess: () => {
      queryClient.setQueryData(['me'], null)
      queryClient.removeQueries({queryKey: ['me']})
      navigate('/partner/login', {replace: true})
    },
  })

  return(
    <div className="min-h-svh bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 flex h-14 items-center justify-between gap-3">
          <div className="font-semibold">Hanna · Кабинет партнёра</div>
          <div className="flex items-center gap-3 text-sm">
            {me &&(
              <span className='text-muted-foreground'>
                {me.name} · <span className='text-foreground'>{me.email}</span>
              </span>
            )}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => logoutMutation.mutate()}
              disabled={logoutMutation.isPending}
            >
              <LogOut className="h-4 w-4" aria-hidden/>
                Выйти
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-4 flex flex-col gap-4 md:flex-row md:gap-6">
        <nav aria-label='Кабинет партнёра' className='md:w-56 md:shrink-0'>
            <ul className="flex gap-1 overflow-x-auto md:flex-col md:gap-0.5">
              {nav.map(({to, label, icon: Icon}) =>(
                <li key={to}>
                  <NavLink
                  to={to}
                  className={({isActive}) =>
                  cn(
                    'flex items-center gap-2 rounded-md px-3 py-2 text-sm whitespace-nowrap transition-colors',
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-foreground hover:bg-accent'
                  )
                }
                  >
                    <Icon className='h-4 w-4' aria-hidden/>
                    {label}
                  </NavLink>
                </li>
              ))}
            </ul>
        </nav>
        <main className='min-w-0 flex-1'>
          <Outlet/>
        </main>
      </div>
    </div>
  )
}
