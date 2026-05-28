# --- Сборка статики ---
FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
# Пустой VITE_API_URL → axios шлёт относительные запросы (/api/...),
# которые на проде проксирует nginx на бэкенд (same-origin, без CORS).
ARG VITE_API_URL=
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

# --- Раздача через nginx ---
FROM nginx:alpine
# Шаблон с ${DOMAIN}: nginx-образ сам прогонит envsubst при старте
# (NGINX_ENVSUBST_FILTER в compose ограничивает подстановку только DOMAIN,
# чтобы не трогать внутренние $host/$uri).
COPY nginx.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html
