"""
Rate limiter singleton — isolated to avoid circular imports.
Import this in routers that need per-endpoint rate limiting.
"""
from slowapi import Limiter
from slowapi.util import get_remote_address

# Global limiter instance used across the app
limiter = Limiter(key_func=get_remote_address, default_limits=["200/minute"])
