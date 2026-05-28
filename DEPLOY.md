# Деплой Hanna на VPS

Стек: FastAPI + PostgreSQL + React-PWA. На сервере всё поднимается через
`docker-compose.prod.yml`. nginx отдаёт статику фронта и проксирует API на
бэкенд (same-origin → без CORS); certbot выпускает и автоматически продлевает
HTTPS-сертификат Let's Encrypt.

## 0. Что нужно заранее
- VPS с Ubuntu 22.04+ (рекомендация по тарифу — внизу).
- Купленный домен. В DNS добавь **A-запись** на IP сервера (и `www`, если нужен).
- Репозиторий на GitHub с этим кодом.

## 1. Установить Docker на сервере
```bash
curl -fsSL https://get.docker.com | sh
```
Проверка: `docker compose version`.

## 2. Открыть порты
```bash
ufw allow 22 && ufw allow 80 && ufw allow 443 && ufw enable
```

## 3. Забрать код и настроить .env
```bash
git clone <твой-репозиторий> hanna && cd hanna
cp .env.example .env
nano .env   # подставь реальные значения
```
Обязательно поменяй: `DOMAIN`, `ACME_EMAIL`, пароли БД, `SECRET_KEY`, `ADMIN_PASSWORD`.
Сгенерировать секрет: `python3 -c "import secrets; print(secrets.token_urlsafe(48))"`.

## 4. Первый запуск — выпуск сертификата
Скрипт получит сертификат Let's Encrypt (порт 80 должен быть свободен, домен —
уже указывать на сервер), затем поднимет весь стек:
```bash
sh init-letsencrypt.sh
```
Внутри: `certbot --standalone` выпускает сертификат для `$DOMAIN`, после чего
`docker compose ... up -d --build` стартует `db`, `backend` (сам прогонит
`alembic upgrade head`), `web` (nginx, HTTPS) и `certbot` (фоновое автопродление).

При **последующих** деплоях скрипт не нужен:
```bash
docker compose -f docker-compose.prod.yml up -d --build
```

## 5. Заполнить базу (один раз)
Схему создали миграции, теперь справочники + админ + демо-данные:
```bash
docker compose -f docker-compose.prod.yml exec backend python -m app.seed.run
```
Создастся администратор из `ADMIN_EMAIL` / `ADMIN_PASSWORD`.

## 6. Проверить
- `https://ТВОЙ_ДОМЕН` — открывается каталог, грузятся `/api/...`.
- `https://ТВОЙ_ДОМЕН/admin` — вход под админскими кредами.
- На телефоне — предложение «Установить приложение» (PWA, работает только по HTTPS).

## Обновление версии
```bash
git pull
docker compose -f docker-compose.prod.yml up -d --build
```
Миграции применятся на старте автоматически.

## Бэкап БД
```bash
docker compose -f docker-compose.prod.yml exec db \
  pg_dump -U $POSTGRES_USER $POSTGRES_DB > backup_$(date +%F).sql
```
Поставь это в `cron` (ежедневно). Данные БД и загруженные фото лежат в
docker-volume'ах (`db_data`, `uploads`) — они переживают пересборку контейнеров.

## Рекомендация по тарифу VPS
- **KVMv-LIGHT (2 ядра / 4 ГБ / 80 ГБ)** — комфортно: и сборка фронта (Vite +
  maplibre любят память), и Postgres + Docker. Оптимальный старт.
- **KVMv-MINI (2 ядра / 2 ГБ)** — бюджетный минимум. Сборка фронта может упасть
  по памяти; либо добавь swap (`fallocate -l 2G /swapfile && ...`), либо
  собирай образ локально и пушь в реестр, а на сервере только запускай.
- NANO/MICRO (≤1 ГБ) — мало, не бери.
- **ДЦ Москва** предпочтительнее Амстердама: аудитория в РФ → ниже задержки.
