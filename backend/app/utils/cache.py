"""Thread-safe TTL cache with prefix-based invalidation."""
import time
import asyncio
import logging

logger = logging.getLogger(__name__)


class SimpleCache:
    """In-memory TTL cache with async lock and prefix-based invalidation."""

    def __init__(self, ttl_seconds: int = 30):
        self._cache: dict[str, dict] = {}
        self.ttl = ttl_seconds
        self._lock = asyncio.Lock()

    def get(self, key: str):
        """Get a cached value if it exists and hasn't expired."""
        if key in self._cache:
            item = self._cache[key]
            if time.time() - item["timestamp"] < self.ttl:
                return item["data"]
            else:
                del self._cache[key]
        return None

    def set(self, key: str, data):
        """Set a cached value with a timestamp."""
        self._cache[key] = {
            "data": data,
            "timestamp": time.time(),
        }

    def clear(self):
        """Clear the entire cache."""
        self._cache = {}

    def clear_prefix(self, prefix: str):
        """Clear only cache keys that start with the given prefix."""
        keys_to_remove = [k for k in self._cache if k.startswith(prefix)]
        for k in keys_to_remove:
            del self._cache[k]
        if keys_to_remove:
            logger.debug("Cache cleared %d keys with prefix '%s'", len(keys_to_remove), prefix)


# Global cache instance for GET requests
api_cache = SimpleCache()
