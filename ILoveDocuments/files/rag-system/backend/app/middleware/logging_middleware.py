"""
logging_middleware.py — Request/response logging for every API call.
Logs: method, path, status code, duration in ms.
"""
import time
import logging
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request

logger = logging.getLogger(__name__)

class LoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        start = time.perf_counter()
        response = await call_next(request)
        ms = (time.perf_counter() - start) * 1000
        logger.info(f"{request.method} {request.url.path} -> {response.status_code} ({ms:.1f}ms)")
        return response
