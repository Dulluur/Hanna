import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
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
