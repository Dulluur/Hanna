import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    // Базовый устанавливаемый PWA: автообновление service worker + прекеш
    // оболочки приложения (workbox по умолчанию). Сложный офлайн-кеш карты/API
    // намеренно не настраиваем. SW работает только в production-сборке.
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['apple-touch-icon.png'],
      // Главный бандл ~3 МБ (maplibre). Поднимаем лимит, чтобы оболочка попала
      // в прекеш. Радикальнее — лениво грузить карту (см. заметку), тогда лимит
      // можно вернуть к дефолту.
      workbox: {
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        // Серверные пути (админка, API, загрузки) не подменяем SPA-оболочкой —
        // иначе SW отдаёт index.html на /admin, и React-роутер выкидывает на главную.
        navigateFallbackDenylist: [/^\/admin/, /^\/api/, /^\/auth/, /^\/uploads/, /^\/health/],
      },
      manifest: {
        name: 'Hanna · Якутск',
        short_name: 'Hanna',
        description: 'Гид по заведениям и афише Якутска',
        lang: 'ru',
        start_url: '/',
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#ffffff',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'pwa-maskable-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src")
    },
  },
  // Прокси для dev-сервера: загруженные фото лежат на бэке (порт 8000)
  // и раздаются через StaticFiles по пути /uploads/*. Без прокси <img
  // src="/uploads/..."> уходит на localhost:5173 и возвращает 404. В
  // production за nginx эти роуты обслуживает он сам, прокси не нужен.
  server: {
    proxy: {
      '/uploads': 'http://localhost:8000',
    },
  },
})
