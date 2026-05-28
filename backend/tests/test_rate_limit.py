"""Тесты rate-limit на /auth/login (5 попыток в минуту по IP).

Эндпоинт должен:
- пропускать первые 5 попыток (даже неуспешные)
- на 6-й попытке отдавать 429 ещё до проверки пароля
- сбрасывать счётчик через минуту (это не проверяем здесь — слишком долго,
  но юнит-тест на _SlidingWindow.window обрабатывается в app/middleware)

Между тестами счётчик чистим вручную, потому что лимитер живёт в памяти
процесса бэкенда (не очищается reseed'ом БД).
"""
from tests.conftest import ADMIN_EMAIL, ADMIN_PASSWORD

# Очистка лимитера выполняется autouse-фикстурой `_reset_rate_limiters` из conftest.


async def test_first_five_attempts_allowed(client) -> None:
    """Все 5 попыток (даже с неверным паролем) проходят валидацию rate-limit и доходят до 401."""
    for _ in range(5):
        r = await client.post(
            "/auth/login", json={"email": ADMIN_EMAIL, "password": "wrong"}
        )
        assert r.status_code == 401


async def test_sixth_attempt_gets_429(client) -> None:
    """На 6-й попытке rate-limit срабатывает раньше проверки пароля."""
    for _ in range(5):
        await client.post(
            "/auth/login", json={"email": ADMIN_EMAIL, "password": "wrong"}
        )
    r = await client.post(
        "/auth/login", json={"email": ADMIN_EMAIL, "password": "wrong"}
    )
    assert r.status_code == 429
    assert "Слишком много" in r.json()["detail"]


async def test_rate_limit_blocks_correct_password_too(client) -> None:
    """Лимит проверяется ДО валидации пароля — даже валидные креды не проходят."""
    for _ in range(5):
        await client.post(
            "/auth/login", json={"email": ADMIN_EMAIL, "password": "wrong"}
        )
    # 6-й запрос с правильным паролем тоже должен быть 429.
    r = await client.post(
        "/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
    )
    assert r.status_code == 429


async def test_successful_login_counts_toward_limit(client) -> None:
    """Удачный login тоже занимает попытку — это правильно для защиты от перебора по аккаунтам."""
    # 5 успешных входов
    for _ in range(5):
        r = await client.post(
            "/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        assert r.status_code == 200
    # 6-й — 429
    r = await client.post(
        "/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
    )
    assert r.status_code == 429
