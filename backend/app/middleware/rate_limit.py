from __future__ import annotations

from collections import defaultdict, deque
from datetime import datetime, timedelta, timezone
from typing import Annotated

from fastapi import Depends, HTTPException, Request, status
from pydantic import BaseModel


class _SlidingWindow:
    def __init__(self, max_attempts: int, window: timedelta) -> None:
        self.max_attempts = max_attempts
        self.window = window
        self._buckets: dict[str, deque[datetime]] = defaultdict(deque)

    def hit(self, key: str) -> None:
        now = datetime.now(timezone.utc)
        bucket = self._buckets[key]

        cutoff = now - self.window
        while bucket and bucket[0] < cutoff:
            bucket.popleft()

        if len(bucket) >= self.max_attempts:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Слишком много попыток. Повторите через минуту",
            )

        bucket.append(now)

    def reset(self) -> None:
        self._buckets.clear()


login_limiter = _SlidingWindow(max_attempts=5, window=timedelta(minutes=1))


def login_rate_limit(request: Request) -> None:
    ip = request.client.host if request.client else "unkown"
    login_limiter.hit(f"login:{ip}")
