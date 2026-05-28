import { NavLink, Outlet, useLocation } from 'react-router-dom'
import {
  Calendar,
  Map as MapIcon,
  Route as RouteIcon,
  Settings,
  UtensilsCrossed,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { BudgetBar } from '@/components/BudgetBar'
import { Logo } from '@/components/Logo'


const tabs = [
  { to: '/', label: 'Еда', icon: UtensilsCrossed, end: true },
  { to: '/events', label: 'Афиша', icon: Calendar, end: false },
  { to: '/map', label: 'Карта', icon: MapIcon, end: false },
  { to: '/route', label: 'Маршрут', icon: RouteIcon, end: false },
  { to: '/settings', label: 'Настройки', icon: Settings, end: false },
] as const


export function Layout() {
  const { pathname } = useLocation()
  const showBudgetBar =
    !pathname.startsWith('/map') && !pathname.startsWith('/settings')

  return (
    <div className="min-h-svh bg-background flex flex-col">
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur">
        <div className="container mx-auto px-4 flex h-14 items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Logo className="h-8 w-8" />
            <h1 className="text-lg font-semibold tracking-tight">
              <a href="/">
                Hanna · Якутск
              </a>
            </h1>
          </div>

          <nav className="hidden md:flex items-center gap-1">
            {tabs.map(({ to, label, icon: Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                  )
                }
              >
                <Icon className="h-4 w-4" aria-hidden />
                <span>{label}</span>
              </NavLink>
            ))}
          </nav>
        </div>
        {showBudgetBar && (
          <div className="container mx-auto px-4 pb-2">
            <BudgetBar />
          </div>
        )}
      </header>

      <main className="flex-1 container mx-auto px-4 py-4 pb-24 md:pb-8">
        <Outlet />
      </main>

      <nav className="fixed bottom-0 inset-x-0 z-20 border-t bg-background md:hidden">
        <ul className="container mx-auto grid grid-cols-5 h-16">
          {tabs.slice(0, 2).map((t) => (
            <SideTab key={t.to} {...t} />
          ))}


          <li className="relative h-full flex flex-col items-center justify-center gap-1">
            <NavLink
              to="/map"
              aria-label="Карта"
              className={({ isActive }) =>
                cn(
                  'absolute -top-5 transition-transform hover:scale-105',
                  isActive && 'scale-105',
                )
              }
            >
              <Logo className="h-14 w-14" />
              <span className="sr-only">Карта</span>
            </NavLink>
            {/* Пустой слот под выступающий логотип, чтобы подпись встала вровень с соседними. */}
            <span className="h-5" aria-hidden />
            <span className="text-xs text-muted-foreground">Карта</span>
          </li>

          {tabs.slice(3).map((t) => (
            <SideTab key={t.to} {...t} />
          ))}
        </ul>
      </nav>
    </div>
  )
}


function SideTab(props: {
  to: string
  label: string
  icon: typeof UtensilsCrossed
  end: boolean
}) {
  const { to, label, icon: Icon, end } = props
  return (
    <li>
      <NavLink
        to={to}
        end={end}
        className={({ isActive }) =>
          cn(
            'flex h-full flex-col items-center justify-center gap-1 text-xs transition-colors',
            isActive
              ? 'text-primary'
              : 'text-muted-foreground hover:text-foreground',
          )
        }
      >
        <Icon className="h-5 w-5" aria-hidden />
        <span>{label}</span>
      </NavLink>
    </li>
  )
}
