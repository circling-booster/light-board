import time
from collections import defaultdict, deque
from collections.abc import Callable

from fastapi import HTTPException, Request


class InMemoryRateLimiter:
    def __init__(self) -> None:
        self.bucket: dict[str, deque[float]] = defaultdict(deque)

    def check(self, key: str, limit: int, window_sec: int) -> None:
        now = time.monotonic()
        q = self.bucket[key]

        while q and now - q[0] > window_sec:
            q.popleft()

        if len(q) >= limit:
            raise HTTPException(status_code=429, detail="요청이 너무 빠릅니다. 잠시 후 다시 시도해 주세요.")

        q.append(now)


limiter = InMemoryRateLimiter()


def rate_limit(action: str, limit: int = 20, window_sec: int = 60) -> Callable:
    async def dependency(request: Request) -> None:
        client_ip = request.client.host if request.client else "unknown"
        auth = request.headers.get("authorization", "guest")
        key = f"{action}:{client_ip}:{auth[-16:]}"
        limiter.check(key, limit=limit, window_sec=window_sec)

    return dependency
