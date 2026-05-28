# Команды проекта Hanna

Шпаргалка по запуску, тестам и установке на прод. Подробный рассказ про прод —
в [DEPLOY.md](DEPLOY.md), здесь только команды.

Стек: backend — FastAPI + SQLAlchemy + PostgreSQL, frontend — React + Vite (PWA).
Локальная разработка целиком поднимается через `docker-compose.yml`.

---

## 1. Локальный запуск через Docker (основной способ)

Нужен только установленный Docker (`docker compose version`).

```bash
# Поднять всё: PostgreSQL + backend (uvicorn --reload) + frontend (vite)
docker compose up --build
```

При **первом** запуске схемы в базе ещё нет — dev-бэкенд, в отличие от прода,
сам миграции не прогоняет. В отдельном терминале (контейнеры пусть работают):

```bash
# Создать таблицы
docker compose exec backend alembic upgrade head

# Заполнить справочники + админа + демо-данные (один раз)
docker compose exec backend python -m app.seed.run
```

Адреса после запуска:

| Что | URL |
|-----|-----|
| Фронт (PWA) | http://localhost:5173 |
| API + Swagger | http://localhost:8000/docs |
| Админка | http://localhost:8000/admin |
| PostgreSQL | localhost:5432 |

Админ по умолчанию в dev: `admin@hanna.local` / `admin`.

Управление:

```bash
docker compose up -d --build     # запустить в фоне
docker compose logs -f backend   # смотреть логи бэкенда
docker compose down              # остановить (данные в volume'ах остаются)
docker compose down -v           # остановить и СТЕРЕТЬ БД и загруженные фото
```

---

## 2. Локальный запуск без Docker (вручную)

База — всё равно в Docker, а приложение — нативно. Нужны Python 3.12 и Node 20+.

```bash
# 1. Только база
docker compose up -d db

# 2. Бэкенд
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -e ".[dev]"
# Хост видит БД на порту 5432 (см. docker-compose.yml)
export DATABASE_URL=postgresql+asyncpg://hanna:hanna@localhost:5432/hanna
alembic upgrade head
python -m app.seed.run
uvicorn app.main:app --reload   # http://localhost:8000

# 3. Фронтенд (в новом терминале)
cd frontend
npm install
npm run dev                     # http://localhost:5173
```

---

## 3. Тесты (backend, pytest)

Тестам нужны **две отдельные базы** — `hanna_test` и `hanna_test_upsell`. Схему
тесты создают сами (`Base.metadata.create_all`), но сами базы надо завести один
раз. Если база недоступна — соответствующие тесты не падают, а пропускаются.

```bash
# Создать тестовые базы (один раз; при повторе будет «уже существует» — не страшно)
docker compose exec db psql -U hanna -d hanna -c "CREATE DATABASE hanna_test;"
docker compose exec db psql -U hanna -d hanna -c "CREATE DATABASE hanna_test_upsell;"
```

Запуск внутри контейнера (зависимости уже стоят в образе):

```bash
docker compose exec \
  -e HANNA_TEST_DATABASE_URL=postgresql+asyncpg://hanna:hanna@db:5432/hanna_test \
  -e HANNA_UPSELL_TEST_DATABASE_URL=postgresql+asyncpg://hanna:hanna@db:5432/hanna_test_upsell \
  backend pytest
```

Или на хосте (из `backend/`, с активированным venv и `pip install -e ".[dev]"`):

```bash
HANNA_TEST_DATABASE_URL=postgresql+asyncpg://hanna:hanna@localhost:5432/hanna_test \
HANNA_UPSELL_TEST_DATABASE_URL=postgresql+asyncpg://hanna:hanna@localhost:5432/hanna_test_upsell \
pytest
```

Полезное:

```bash
pytest -v                       # подробный вывод
pytest tests/test_upsell.py     # один файл
pytest -k partner               # тесты по подстроке в имени
```

---

## 4. Проверки фронтенда (lint / типы / сборка)

```bash
cd frontend
npm run lint                    # ESLint
npx tsc -b                      # проверка типов TypeScript
npm run build                   # прод-сборка (tsc + vite build)
npm run preview                 # посмотреть прод-сборку локально (http://localhost:4173)
```

---

## 5. Установка на прод

Полная инструкция с пояснениями — в [DEPLOY.md](DEPLOY.md). Краткая
последовательность команд на сервере (Ubuntu 22.04+, домен уже указывает A-записью
на IP):

```bash
# 1. Docker
curl -fsSL https://get.docker.com | sh

# 2. Порты
ufw allow 22 && ufw allow 80 && ufw allow 443 && ufw enable

# 3. Код и окружение
git clone <репозиторий> hanna && cd hanna
cp .env.example .env
nano .env        # заполнить реальные значения (ключи — ниже)

# 4. Первый запуск: выпуск HTTPS-сертификата + подъём всего стека
sh init-letsencrypt.sh

# 5. Наполнить базу (один раз). Миграции бэкенд прогоняет сам на старте.
docker compose -f docker-compose.prod.yml exec backend python -m app.seed.run
```

Обязательные ключи в `.env` (см. `.env.example`):

| Ключ | Назначение |
|------|------------|
| `DOMAIN` | боевой домен (A-запись на сервер) |
| `ACME_EMAIL` | почта для Let's Encrypt — **нужна для `init-letsencrypt.sh`** |
| `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` | креды БД |
| `DATABASE_URL` | строка подключения (host = `db`, те же креды) |
| `SECRET_KEY` | секрет сессий: `python3 -c "import secrets; print(secrets.token_urlsafe(48))"` |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | из них сид создаёт администратора |
| `CORS_ORIGINS` | `https://<домен>` |

Обновление версии:

```bash
git pull
docker compose -f docker-compose.prod.yml up -d --build   # миграции применятся на старте
```

Бэкап БД (поставить в cron):

```bash
docker compose -f docker-compose.prod.yml exec db \
  pg_dump -U $POSTGRES_USER $POSTGRES_DB > backup_$(date +%F).sql
```
