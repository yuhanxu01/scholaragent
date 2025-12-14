import hashlib
from core.cache import CacheService


class LLMCache:
    """LLM响应缓存"""

    CACHE_TIMEOUT = 86400  # 24小时

    @classmethod
    def _make_key(cls, prompt: str, params: dict) -> str:
        """生成缓存键"""
        data = f'{prompt}:{params}'
        hash_val = hashlib.sha256(data.encode()).hexdigest()[:16]
        return f'llm:{hash_val}'

    @classmethod
    def get(cls, prompt: str, params: dict = None) -> str:
        """获取缓存的响应"""
        key = cls._make_key(prompt, params or {})
        return CacheService.get(key)

    @classmethod
    def set(cls, prompt: str, response: str, params: dict = None) -> None:
        """缓存响应"""
        key = cls._make_key(prompt, params or {})
        CacheService.set(key, response, cls.CACHE_TIMEOUT)