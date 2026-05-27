import { Navigate, Route, Routes } from 'react-router-dom'
import { Layout } from '@/components/Layout'
import { PartnerLayout } from '@/components/PartnerLayout'
import { PlacesPage } from '@/pages/public/PlacesPage'
import { PlaceDetailPage } from '@/pages/public/PlaceDetailPage'
import { EventsPage } from '@/pages/public/EventsPage'
import { EventDetailPage } from '@/pages/public/EventDetailPage'
import { MapPage } from '@/pages/public/MapPage'
import { RoutePage } from '@/pages/public/RoutePage'
import { SettingsPage } from '@/pages/public/SettingsPage'
import { TermsPage } from '@/pages/public/TermsPage'
import { LoginPage } from '@/pages/partner/LoginPage'
import { RegisterPage } from '@/pages/partner/RegisterPage'
import { DashboardPage } from '@/pages/partner/DashboardPage'
import { DishesPage } from '@/pages/partner/DishesPage'
import { PartnerEventsPage } from '@/pages/partner/EventsPage'
import { InfoPage } from '@/pages/partner/InfoPage'
import { RequireAuth } from '@/lib/auth'

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
        <Route path="map" element={<MapPage />} />
        <Route path="route" element={<RoutePage />} />
        {/* Старый путь /favorites - редирект на /route, чтобы не сломать
            существующие закладки и ссылки во внешних местах. */}
        <Route path="favorites" element={<Navigate to="/route" replace />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="legal/terms" element={<TermsPage />} />
      </Route>

      {/* Страница логина и регистрации - без layout */}
      <Route path="/partner/login" element={<LoginPage />} />
      <Route path="/partner/register" element={<RegisterPage />} />

      {/* Партнёрский кабинет - защищён ролью 'partner' */}
      <Route
        path="/partner"
        element={
          <RequireAuth role="partner">
            <PartnerLayout />
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
