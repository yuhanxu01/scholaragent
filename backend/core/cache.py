from django.core.cache import cache
from functools import wraps
import hashlib
import json
from typing import Any, Callable, Optional


class CacheService:
    """缓存服务"""

    # 缓存时间常量
    SHORT = 60  # 1分钟
    MEDIUM = 300  # 5分钟
    LONG = 3600  # 1小时
    DAY = 86400  # 1天

    @staticmethod
    def make_key(*args, **kwargs) -> str:
        """生成缓存键"""
        data = json.dumps({'args': args, 'kwargs': kwargs}, sort_keys=True, default=str)
        return hashlib.md5(data.encode()).hexdigest()

    @classmethod
    def get(cls, key: str) -> Any:
        """获取缓存"""
        return cache.get(key)

    @classmethod
    def set(cls, key: str, value: Any, timeout: int = MEDIUM) -> None:
        """设置缓存"""
        cache.set(key, value, timeout)

    @classmethod
    def delete(cls, key: str) -> None:
        """删除缓存"""
        cache.delete(key)

    @classmethod
    def delete_pattern(cls, pattern: str) -> None:
        """删除匹配模式的缓存（需要django-redis）"""
        from django_redis import get_redis_connection
        conn = get_redis_connection('default')
        keys = conn.keys(f'scholarmind:{pattern}')
        if keys:
            conn.delete(*keys)

    @classmethod
    def get_or_set(cls, key: str, default: Callable, timeout: int = MEDIUM) -> Any:
        """获取或设置缓存"""
        value = cache.get(key)
        if value is None:
            value = default() if callable(default) else default
            cache.set(key, value, timeout)
        return value


def cached(timeout: int = CacheService.MEDIUM, key_prefix: str = ''):
    """缓存装饰器"""
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        def wrapper(*args, **kwargs):
            # 生成缓存键
            cache_key = f'{key_prefix}:{func.__name__}:{CacheService.make_key(*args, **kwargs)}'

            # 尝试获取缓存
            result = cache.get(cache_key)
            if result is not None:
                return result

            # 执行函数并缓存结果
            result = func(*args, **kwargs)
            cache.set(cache_key, result, timeout)
            return result

        return wrapper
    return decorator


def invalidate_cache(key_pattern: str):
    """缓存失效装饰器"""
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        def wrapper(*args, **kwargs):
            result = func(*args, **kwargs)
            CacheService.delete_pattern(key_pattern)
            return result
        return wrapper
    return decorator