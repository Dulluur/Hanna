import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { Layout } from '@/components/Layout'
import { PartnerLayout } from '@/components/PartnerLayout'
import { PlacesPage } from '@/pages/public/PlacesPage'
import { PlaceDetailPage } from '@/pages/public/PlaceDetailPage'
import { EventsPage } from '@/pages/public/EventsPage'
import { EventDetailPage } from '@/pages/public/EventDetailPage'
import { RoutePage } from '@/pages/public/RoutePage'
import { SettingsPage } from '@/pages/public/SettingsPage'
import { TermsPage } from '@/pages/public/TermsPage'
import { RequireAuth } from '@/lib/auth'

const MapPage = lazy(() => import('@/pages/public/MapPage').then((m) => ({ default: m.MapPage })))
const LoginPage = lazy(() => import('@/pages/partner/LoginPage').then((m) => ({ default: m.LoginPage })))
const RegisterPage = lazy(() => import('@/pages/partner/RegisterPage').then((m) => ({ default: m.RegisterPage })))
const DashboardPage = lazy(() => import('@/pages/partner/DashboardPage').then((m) => ({ default: m.DashboardPage })))
const DishesPage = lazy(() => import('@/pages/partner/DishesPage').then((m) => ({ default: m.DishesPage })))
const PartnerEventsPage = lazy(() => import('@/pages/partner/EventsPage').then((m) => ({ default: m.PartnerEventsPage })))
const InfoPage = lazy(() => import('@/pages/partner/InfoPage').then((m) => ({ default: m.InfoPage })))

function Fallback() {
  return (
    <div className="flex h-[60vh] items-center justify-center text-sm text-muted-foreground">
      Загрузка…
    </div>
  )
}

/**
 * Корневой компонент маршрутов.
 *
 * Три зоны:
 *  - публичная (Layout) — гость без авторизации
 *  - партнёрский кабинет (PartnerLayout + RequireAuth role='partner')
 *  - страница логина — без layout, доступна всем
 */
export default function App() {
  return (
    <Routes>
      {/* Публичная часть */}
      <Route element={<Layout />}>
        <Route index element={<PlacesPage />} />
        <Route path="places/:id" element={<PlaceDetailPage />} />
        <Route path="events" element={<EventsPage />} />
        <Route path="events/:id" element={<EventDetailPage />} />
        <Route
          path="map"
          element={
            <Suspense fallback={<Fallback />}>
              <MapPage />
            </Suspense>
          }
        />
        <Route path="route" element={<RoutePage />} />
        {/* Старый путь /favorites - редирект на /route, чтобы не сломать
            существующие закладки и ссылки во внешних местах. */}
        <Route path="favorites" element={<Navigate to="/route" replace />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="legal/terms" element={<TermsPage />} />
      </Route>

      {/* Страница логина и регистрации - без layout */}
      <Route
        path="/partner/login"
        element={
          <Suspense fallback={<Fallback />}>
            <LoginPage />
          </Suspense>
        }
      />
      <Route
        path="/partner/register"
        element={
          <Suspense fallback={<Fallback />}>
            <RegisterPage />
          </Suspense>
        }
      />

      {/* Партнёрский кабинет - защищён ролью 'partner' */}
      <Route
        path="/partner"
        element={
          <RequireAuth role="partner">
            <Suspense fallback={<Fallback />}>
              <PartnerLayout />
            </Suspense>
          </RequireAuth>
        }
      >
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="dishes" element={<DishesPage />} />
        <Route path="events" element={<PartnerEventsPage />} />
        <Route path="info" element={<InfoPage />} />
      </Route>

      {/* Неизвестные пути — на главную */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
