#!/bin/sh
# Одноразовый выпуск Let's Encrypt-сертификата перед первым запуском.
# Запуск на сервере:  sh init-letsencrypt.sh
# Требует заполненный .env (DOMAIN, ACME_EMAIL) и свободный порт 80.
set -e

DOMAIN=$(grep '^DOMAIN=' .env | cut -d= -f2-)
ACME_EMAIL=$(grep '^ACME_EMAIL=' .env | cut -d= -f2-)

if [ -z "$DOMAIN" ] || [ -z "$ACME_EMAIL" ]; then
  echo "Заполни DOMAIN и ACME_EMAIL в .env"
  exit 1
fi

echo ">>> Выпускаю сертификат для $DOMAIN (--standalone, порт 80)"
docker compose -f docker-compose.prod.yml run --rm --entrypoint certbot -p 80:80 certbot \
  certonly --standalone \
  --email "$ACME_EMAIL" --agree-tos --no-eff-email \
  -d "$DOMAIN"

echo ">>> Поднимаю весь стек"
docker compose -f docker-compose.prod.yml up -d --build

echo ">>> Готово. Проверь https://$DOMAIN"
echo ">>> Не забудь сидинг: docker compose -f docker-compose.prod.yml exec backend python -m app.seed.run"
