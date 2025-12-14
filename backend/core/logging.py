import logging
import time
from functools import wraps
from typing import Callable, Any
from contextlib import contextmanager


class LoggerMixin:
    """日志混入类"""

    @property
    def logger(self):
        if not hasattr(self, '_logger'):
            self._logger = logging.getLogger(self.__class__.__module__)
        return self._logger


def log_execution(logger_name: str = None, level: int = logging.INFO):
    """记录函数执行的装饰器"""
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        def wrapper(*args, **kwargs):
            logger = logging.getLogger(logger_name or func.__module__)

            start_time = time.time()
            func_name = func.__name__

            logger.log(level, f'Starting {func_name}')

            try:
                result = func(*args, **kwargs)
                duration = time.time() - start_time
                logger.log(level, f'Completed {func_name} in {duration:.2f}s')
                return result
            except Exception as e:
                duration = time.time() - start_time
                logger.error(f'Failed {func_name} after {duration:.2f}s: {e}')
                raise

        return wrapper
    return decorator


async def async_log_execution(logger_name: str = None, level: int = logging.INFO):
    """异步版本"""
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        async def wrapper(*args, **kwargs):
            logger = logging.getLogger(logger_name or func.__module__)

            start_time = time.time()
            func_name = func.__name__

            logger.log(level, f'Starting {func_name}')

            try:
                result = await func(*args, **kwargs)
                duration = time.time() - start_time
                logger.log(level, f'Completed {func_name} in {duration:.2f}s')
                return result
            except Exception as e:
                duration = time.time() - start_time
                logger.error(f'Failed {func_name} after {duration:.2f}s: {e}')
                raise

        return wrapper
    return decorator


@contextmanager
def log_context(logger: logging.Logger, operation: str, **extra):
    """日志上下文管理器"""
    start_time = time.time()
    logger.info(f'Starting: {operation}', extra=extra)

    try:
        yield
        duration = time.time() - start_time
        logger.info(f'Completed: {operation} ({duration:.2f}s)', extra=extra)
    except Exception as e:
        duration = time.time() - start_time
        logger.error(f'Failed: {operation} ({duration:.2f}s): {e}', extra=extra)
        raise