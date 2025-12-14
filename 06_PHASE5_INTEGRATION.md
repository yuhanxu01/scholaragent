# Phase 5: 集成优化 (Sprint 10-11)

## 阶段目标
完成前后端集成、性能优化、错误处理、测试覆盖和代码质量提升。

---

## Task 5.1: 数据库和查询优化

### 任务描述
优化数据库查询性能，添加索引，实现查询优化。

### AI Code Agent 提示词

```
请实现数据库和查询优化：

## 1. 添加数据库索引

更新各模型的 Meta 类，添加适当的索引：

```python
# apps/documents/models.py

class Document(models.Model):
    # ... fields ...
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'status']),
            models.Index(fields=['user', '-created_at']),
            models.Index(fields=['user', 'file_type']),
            models.Index(fields=['status', 'created_at']),
        ]


class DocumentChunk(models.Model):
    # ... fields ...
    
    class Meta:
        ordering = ['document', 'order']
        indexes = [
            models.Index(fields=['document', 'order']),
            models.Index(fields=['document', 'chunk_type']),
            models.Index(fields=['chunk_type']),
        ]


# apps/knowledge/models.py

class Concept(models.Model):
    class Meta:
        indexes = [
            models.Index(fields=['user', 'name']),
            models.Index(fields=['user', 'concept_type']),
            models.Index(fields=['user', 'is_mastered']),
            models.Index(fields=['document', 'concept_type']),
            models.Index(fields=['user', '-importance', 'name']),
        ]


class Flashcard(models.Model):
    class Meta:
        indexes = [
            models.Index(fields=['user', 'next_review_date']),
            models.Index(fields=['user', 'deck']),
            models.Index(fields=['user', 'is_suspended', 'next_review_date']),
        ]


# apps/agent/models.py

class Conversation(models.Model):
    class Meta:
        indexes = [
            models.Index(fields=['user', '-updated_at']),
            models.Index(fields=['user', 'is_active']),
            models.Index(fields=['document', '-updated_at']),
        ]


class Message(models.Model):
    class Meta:
        indexes = [
            models.Index(fields=['conversation', 'created_at']),
            models.Index(fields=['conversation', 'role']),
        ]
```

## 2. 优化查询 - 使用 select_related 和 prefetch_related

```python
# apps/documents/views.py

class DocumentViewSet(viewsets.ModelViewSet):
    def get_queryset(self):
        queryset = Document.objects.filter(user=self.request.user)
        
        # 根据action选择预加载
        if self.action == 'list':
            return queryset.only(
                'id', 'title', 'file_type', 'status', 
                'word_count', 'reading_progress', 'created_at'
            )
        elif self.action == 'retrieve':
            return queryset.prefetch_related(
                'sections',
                Prefetch(
                    'chunks',
                    queryset=DocumentChunk.objects.order_by('order')
                )
            )
        return queryset


# apps/knowledge/views.py

class ConceptViewSet(viewsets.ModelViewSet):
    def get_queryset(self):
        queryset = Concept.objects.filter(user=self.request.user)
        
        if self.action == 'list':
            queryset = queryset.select_related('document').only(
                'id', 'name', 'concept_type', 'description',
                'is_mastered', 'importance', 'document__title'
            )
        elif self.action == 'retrieve':
            queryset = queryset.select_related('document', 'chunk').prefetch_related(
                'notes', 'flashcards',
                Prefetch(
                    'outgoing_relations',
                    queryset=ConceptRelation.objects.select_related('target_concept')
                ),
                Prefetch(
                    'incoming_relations', 
                    queryset=ConceptRelation.objects.select_related('source_concept')
                )
            )
        return queryset


class NoteViewSet(viewsets.ModelViewSet):
    def get_queryset(self):
        return Note.objects.filter(
            user=self.request.user,
            is_archived=False
        ).select_related('document').prefetch_related('linked_concepts')


class FlashcardViewSet(viewsets.ModelViewSet):
    def get_queryset(self):
        return Flashcard.objects.filter(
            user=self.request.user
        ).select_related('document', 'concept')
```

## 3. 分页优化

```python
# core/pagination.py

from rest_framework.pagination import CursorPagination, PageNumberPagination


class StandardPagination(PageNumberPagination):
    """标准分页"""
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100


class CursorPaginationByCreated(CursorPagination):
    """基于创建时间的游标分页（用于大数据集）"""
    page_size = 20
    ordering = '-created_at'
    cursor_query_param = 'cursor'


class CursorPaginationByUpdated(CursorPagination):
    """基于更新时间的游标分页"""
    page_size = 20
    ordering = '-updated_at'


# 在settings中配置默认分页
REST_FRAMEWORK = {
    'DEFAULT_PAGINATION_CLASS': 'core.pagination.StandardPagination',
    'PAGE_SIZE': 20,
}
```

## 4. 数据库连接池配置

```python
# config/settings/production.py

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': env('DB_NAME'),
        'USER': env('DB_USER'),
        'PASSWORD': env('DB_PASSWORD'),
        'HOST': env('DB_HOST'),
        'PORT': env('DB_PORT', default='5432'),
        'CONN_MAX_AGE': 600,  # 连接保持10分钟
        'OPTIONS': {
            'connect_timeout': 10,
        },
    }
}

# 使用 django-db-connection-pool (可选)
# pip install django-db-connection-pool
```

## 5. 查询分析和监控

```python
# core/middleware.py

import time
import logging
from django.db import connection
from django.conf import settings

logger = logging.getLogger('queries')


class QueryCountMiddleware:
    """统计每个请求的数据库查询次数"""
    
    def __init__(self, get_response):
        self.get_response = get_response
    
    def __call__(self, request):
        if settings.DEBUG:
            # 重置查询日志
            connection.queries_log.clear()
            
        start_time = time.time()
        response = self.get_response(request)
        duration = time.time() - start_time
        
        if settings.DEBUG:
            query_count = len(connection.queries)
            if query_count > 10:  # 超过10条查询则警告
                logger.warning(
                    f'Request {request.path} executed {query_count} queries in {duration:.2f}s'
                )
        
        return response


# 添加到 MIDDLEWARE
MIDDLEWARE = [
    # ...
    'core.middleware.QueryCountMiddleware',
]
```

## 验收标准
1. 数据库迁移成功添加索引
2. 列表查询不产生N+1问题
3. 大数据集分页正常
4. 查询性能监控正常
```

---

## Task 5.2: 缓存策略

### AI Code Agent 提示词

```
请实现缓存策略：

## 1. Redis缓存配置

```python
# config/settings/base.py

CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.redis.RedisCache',
        'LOCATION': env('REDIS_URL', default='redis://localhost:6379/0'),
        'OPTIONS': {
            'CLIENT_CLASS': 'django_redis.client.DefaultClient',
        },
        'KEY_PREFIX': 'scholarmind',
        'TIMEOUT': 300,  # 默认5分钟
    },
    'sessions': {
        'BACKEND': 'django.core.cache.backends.redis.RedisCache',
        'LOCATION': env('REDIS_URL', default='redis://localhost:6379/1'),
        'KEY_PREFIX': 'session',
    }
}

# Session使用缓存
SESSION_ENGINE = 'django.contrib.sessions.backends.cache'
SESSION_CACHE_ALIAS = 'sessions'
```

## 2. 缓存服务

```python
# core/cache.py

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
```

## 3. 视图级缓存

```python
# apps/documents/views.py

from django.views.decorators.cache import cache_page
from django.utils.decorators import method_decorator
from core.cache import cached, CacheService


class DocumentViewSet(viewsets.ModelViewSet):
    
    # 列表缓存30秒
    @method_decorator(cache_page(30))
    def list(self, request, *args, **kwargs):
        return super().list(request, *args, **kwargs)
    
    @action(detail=True, methods=['get'])
    def content(self, request, pk=None):
        """获取文档内容（带缓存）"""
        cache_key = f'doc_content:{pk}'
        
        content = CacheService.get(cache_key)
        if content is None:
            document = self.get_object()
            serializer = DocumentContentSerializer(document)
            content = serializer.data
            CacheService.set(cache_key, content, CacheService.LONG)
        
        return Response(content)


# apps/knowledge/views.py

class ConceptViewSet(viewsets.ModelViewSet):
    
    @action(detail=False, methods=['get'])
    def graph(self, request):
        """概念图谱（带缓存）"""
        doc_id = request.query_params.get('document')
        user_id = request.user.id
        
        cache_key = f'concept_graph:{user_id}:{doc_id or "all"}'
        
        graph = CacheService.get(cache_key)
        if graph is None:
            service = ConceptGraphService(user_id)
            graph = service.get_concept_graph(doc_id=doc_id)
            CacheService.set(cache_key, graph, CacheService.MEDIUM)
        
        return Response(graph)
```

## 4. 用户数据缓存

```python
# apps/users/services.py

from core.cache import CacheService, cached


class UserCacheService:
    """用户数据缓存服务"""
    
    @staticmethod
    def get_user_profile(user_id: int) -> dict:
        """获取用户画像（带缓存）"""
        cache_key = f'user_profile:{user_id}'
        
        profile = CacheService.get(cache_key)
        if profile is None:
            from apps.users.models import UserProfile
            from apps.users.serializers import UserProfileSerializer
            
            try:
                profile_obj = UserProfile.objects.select_related('user').get(user_id=user_id)
                profile = UserProfileSerializer(profile_obj).data
                CacheService.set(cache_key, profile, CacheService.LONG)
            except UserProfile.DoesNotExist:
                profile = {}
        
        return profile
    
    @staticmethod
    def invalidate_user_profile(user_id: int):
        """清除用户画像缓存"""
        CacheService.delete(f'user_profile:{user_id}')
    
    @staticmethod
    def get_user_stats(user_id: int) -> dict:
        """获取用户统计（带缓存）"""
        cache_key = f'user_stats:{user_id}'
        
        stats = CacheService.get(cache_key)
        if stats is None:
            from apps.documents.models import Document
            from apps.knowledge.models import Concept, Note, Flashcard
            from apps.agent.models import Message
            
            stats = {
                'total_documents': Document.objects.filter(user_id=user_id).count(),
                'total_concepts': Concept.objects.filter(user_id=user_id).count(),
                'mastered_concepts': Concept.objects.filter(user_id=user_id, is_mastered=True).count(),
                'total_notes': Note.objects.filter(user_id=user_id).count(),
                'total_flashcards': Flashcard.objects.filter(user_id=user_id).count(),
                'total_questions': Message.objects.filter(
                    conversation__user_id=user_id, role='user'
                ).count(),
            }
            CacheService.set(cache_key, stats, CacheService.SHORT)
        
        return stats
```

## 5. LLM响应缓存

```python
# core/llm/cache.py

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


# 在 DeepSeekClient 中使用
class DeepSeekClient:
    async def generate(self, prompt: str, use_cache: bool = True, **kwargs):
        # 检查缓存
        if use_cache:
            cached_response = LLMCache.get(prompt, kwargs)
            if cached_response:
                return {"content": cached_response, "cached": True}
        
        # 调用API
        response = await self._call_api(prompt, **kwargs)
        
        # 缓存响应
        if use_cache and response.get("content"):
            LLMCache.set(prompt, response["content"], kwargs)
        
        return response
```

## 6. 前端缓存策略

```typescript
// src/services/api.ts

import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5分钟内数据视为新鲜
      cacheTime: 30 * 60 * 1000, // 缓存保留30分钟
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

// 使用示例
import { useQuery } from '@tanstack/react-query';

export function useDocuments() {
  return useQuery({
    queryKey: ['documents'],
    queryFn: () => documentService.list(),
    staleTime: 60 * 1000, // 文档列表1分钟内不重新获取
  });
}

export function useDocumentContent(id: string) {
  return useQuery({
    queryKey: ['document', id, 'content'],
    queryFn: () => documentService.getContent(id),
    staleTime: 5 * 60 * 1000, // 文档内容5分钟内不重新获取
    enabled: !!id,
  });
}

export function useConcepts(documentId?: string) {
  return useQuery({
    queryKey: ['concepts', { documentId }],
    queryFn: () => knowledgeService.getConcepts({ document: documentId }),
    staleTime: 2 * 60 * 1000,
  });
}
```

## 验收标准
1. Redis缓存配置正确
2. 热点数据正确缓存
3. 缓存失效机制正常
4. LLM响应缓存减少重复调用
5. 前端缓存策略合理
```

---

## Task 5.3: 错误处理和日志系统

### AI Code Agent 提示词

```
请实现完整的错误处理和日志系统：

## 1. 自定义异常类

```python
# core/exceptions.py

from rest_framework.exceptions import APIException
from rest_framework import status


class ScholarMindException(Exception):
    """基础异常类"""
    
    def __init__(self, message: str, code: str = None, details: dict = None):
        self.message = message
        self.code = code or 'error'
        self.details = details or {}
        super().__init__(self.message)


class DocumentProcessingError(ScholarMindException):
    """文档处理错误"""
    pass


class LLMServiceError(ScholarMindException):
    """LLM服务错误"""
    pass


class ToolExecutionError(ScholarMindException):
    """工具执行错误"""
    pass


class RateLimitError(ScholarMindException):
    """速率限制错误"""
    pass


class ValidationError(ScholarMindException):
    """验证错误"""
    pass


# REST Framework 异常

class APIError(APIException):
    """API错误基类"""
    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = '请求错误'
    default_code = 'api_error'


class ResourceNotFoundError(APIException):
    status_code = status.HTTP_404_NOT_FOUND
    default_detail = '资源不存在'
    default_code = 'not_found'


class PermissionDeniedError(APIException):
    status_code = status.HTTP_403_FORBIDDEN
    default_detail = '权限不足'
    default_code = 'permission_denied'


class ServiceUnavailableError(APIException):
    status_code = status.HTTP_503_SERVICE_UNAVAILABLE
    default_detail = '服务暂时不可用'
    default_code = 'service_unavailable'
```

## 2. 全局异常处理器

```python
# core/exception_handlers.py

import logging
import traceback
from rest_framework.views import exception_handler
from rest_framework.response import Response
from rest_framework import status
from django.core.exceptions import PermissionDenied, ObjectDoesNotExist
from django.http import Http404

from .exceptions import ScholarMindException, LLMServiceError

logger = logging.getLogger('api')


def custom_exception_handler(exc, context):
    """自定义异常处理器"""
    
    # 首先调用默认处理器
    response = exception_handler(exc, context)
    
    # 获取请求信息用于日志
    request = context.get('request')
    view = context.get('view')
    
    # 记录异常信息
    log_context = {
        'path': request.path if request else 'unknown',
        'method': request.method if request else 'unknown',
        'user': str(request.user) if request else 'anonymous',
        'view': view.__class__.__name__ if view else 'unknown',
    }
    
    if response is not None:
        # 标准化错误响应格式
        response.data = {
            'success': False,
            'error': {
                'code': getattr(exc, 'default_code', 'error'),
                'message': str(exc.detail) if hasattr(exc, 'detail') else str(exc),
                'details': getattr(exc, 'details', {}),
            }
        }
        
        # 记录警告级别日志
        logger.warning(f'API Error: {exc}', extra=log_context)
        
        return response
    
    # 处理未被DRF捕获的异常
    
    if isinstance(exc, ScholarMindException):
        logger.error(f'Application Error: {exc}', extra=log_context, exc_info=True)
        return Response({
            'success': False,
            'error': {
                'code': exc.code,
                'message': exc.message,
                'details': exc.details,
            }
        }, status=status.HTTP_400_BAD_REQUEST)
    
    if isinstance(exc, LLMServiceError):
        logger.error(f'LLM Service Error: {exc}', extra=log_context, exc_info=True)
        return Response({
            'success': False,
            'error': {
                'code': 'llm_error',
                'message': '智能服务暂时不可用，请稍后重试',
            }
        }, status=status.HTTP_503_SERVICE_UNAVAILABLE)
    
    if isinstance(exc, Http404) or isinstance(exc, ObjectDoesNotExist):
        return Response({
            'success': False,
            'error': {
                'code': 'not_found',
                'message': '请求的资源不存在',
            }
        }, status=status.HTTP_404_NOT_FOUND)
    
    if isinstance(exc, PermissionDenied):
        return Response({
            'success': False,
            'error': {
                'code': 'permission_denied',
                'message': '您没有权限执行此操作',
            }
        }, status=status.HTTP_403_FORBIDDEN)
    
    # 未知异常 - 记录详细错误
    logger.error(
        f'Unhandled Exception: {exc}',
        extra={**log_context, 'traceback': traceback.format_exc()},
        exc_info=True
    )
    
    # 生产环境返回通用错误
    return Response({
        'success': False,
        'error': {
            'code': 'internal_error',
            'message': '服务器内部错误，请稍后重试',
        }
    }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# 配置
# config/settings/base.py
REST_FRAMEWORK = {
    'EXCEPTION_HANDLER': 'core.exception_handlers.custom_exception_handler',
}
```

## 3. 日志配置

```python
# config/settings/base.py

import os

LOG_DIR = BASE_DIR / 'logs'
LOG_DIR.mkdir(exist_ok=True)

LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    
    'formatters': {
        'verbose': {
            'format': '{levelname} {asctime} {module} {process:d} {thread:d} {message}',
            'style': '{',
        },
        'simple': {
            'format': '{levelname} {asctime} {module} {message}',
            'style': '{',
        },
        'json': {
            '()': 'pythonjsonlogger.jsonlogger.JsonFormatter',
            'format': '%(asctime)s %(levelname)s %(name)s %(message)s',
        },
    },
    
    'filters': {
        'require_debug_true': {
            '()': 'django.utils.log.RequireDebugTrue',
        },
        'require_debug_false': {
            '()': 'django.utils.log.RequireDebugFalse',
        },
    },
    
    'handlers': {
        'console': {
            'level': 'DEBUG',
            'class': 'logging.StreamHandler',
            'formatter': 'simple',
        },
        'file': {
            'level': 'INFO',
            'class': 'logging.handlers.RotatingFileHandler',
            'filename': LOG_DIR / 'app.log',
            'maxBytes': 10 * 1024 * 1024,  # 10MB
            'backupCount': 5,
            'formatter': 'verbose',
        },
        'error_file': {
            'level': 'ERROR',
            'class': 'logging.handlers.RotatingFileHandler',
            'filename': LOG_DIR / 'error.log',
            'maxBytes': 10 * 1024 * 1024,
            'backupCount': 10,
            'formatter': 'verbose',
        },
        'json_file': {
            'level': 'INFO',
            'class': 'logging.handlers.RotatingFileHandler',
            'filename': LOG_DIR / 'app.json.log',
            'maxBytes': 10 * 1024 * 1024,
            'backupCount': 5,
            'formatter': 'json',
        },
    },
    
    'loggers': {
        'django': {
            'handlers': ['console', 'file'],
            'level': 'INFO',
            'propagate': True,
        },
        'django.request': {
            'handlers': ['error_file'],
            'level': 'ERROR',
            'propagate': False,
        },
        'api': {
            'handlers': ['console', 'file', 'json_file'],
            'level': 'INFO',
            'propagate': False,
        },
        'agent': {
            'handlers': ['console', 'file', 'json_file'],
            'level': 'DEBUG',
            'propagate': False,
        },
        'llm': {
            'handlers': ['console', 'file'],
            'level': 'DEBUG',
            'propagate': False,
        },
        'documents': {
            'handlers': ['console', 'file'],
            'level': 'INFO',
            'propagate': False,
        },
        'celery': {
            'handlers': ['console', 'file'],
            'level': 'INFO',
            'propagate': False,
        },
        'queries': {
            'handlers': ['console'],
            'level': 'WARNING',
            'propagate': False,
        },
    },
    
    'root': {
        'handlers': ['console', 'file'],
        'level': 'INFO',
    },
}

# 安装依赖: pip install python-json-logger
```

## 4. 业务日志工具

```python
# core/logging.py

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
```

## 5. Agent执行日志

```python
# apps/agent/core/executor.py 添加日志

import logging
from core.logging import LoggerMixin, log_context

logger = logging.getLogger('agent')


class ScholarAgent(LoggerMixin):
    
    async def run(self, user_input: str, context: dict):
        with log_context(logger, 'agent_execution', 
                        user_id=self.user_id, 
                        conversation_id=self.conversation_id):
            
            # 规划阶段
            logger.info(f'Planning for query: {user_input[:100]}...')
            plan = await self._create_plan(user_input, memory_context, context)
            logger.info(f'Plan created with {len(plan.get("plan", []))} steps')
            
            # 执行循环
            for i in range(self.MAX_ITERATIONS):
                logger.debug(f'Iteration {i+1}/{self.MAX_ITERATIONS}')
                
                thought = await self._think(user_input, memory_context, context)
                
                if "action" in thought:
                    logger.info(f'Executing tool: {thought["action"]}')
                    # ...
                elif "final_answer" in thought:
                    logger.info(f'Answer generated after {i+1} iterations')
                    break
            
            logger.info(f'Agent execution completed')
```

## 6. 前端错误处理

```typescript
// src/services/api.ts

import axios from 'axios';
import { toast } from 'react-hot-toast';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
});

// 响应拦截器
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const { response } = error;
    
    if (!response) {
      toast.error('网络错误，请检查网络连接');
      return Promise.reject(error);
    }
    
    const errorData = response.data?.error || {};
    const message = errorData.message || '请求失败';
    
    switch (response.status) {
      case 400:
        toast.error(message);
        break;
      case 401:
        toast.error('登录已过期，请重新登录');
        // 跳转登录
        window.location.href = '/login';
        break;
      case 403:
        toast.error('您没有权限执行此操作');
        break;
      case 404:
        toast.error('请求的资源不存在');
        break;
      case 429:
        toast.error('请求过于频繁，请稍后再试');
        break;
      case 500:
        toast.error('服务器错误，请稍后重试');
        break;
      case 503:
        toast.error('服务暂时不可用，请稍后重试');
        break;
      default:
        toast.error(message);
    }
    
    return Promise.reject(error);
  }
);


// src/components/common/ErrorBoundary.tsx

import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
    // 可以发送到错误追踪服务
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="flex flex-col items-center justify-center min-h-screen">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">出错了</h1>
          <p className="text-gray-600 mb-4">页面发生了一些问题</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg"
          >
            刷新页面
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
```

## 验收标准
1. 自定义异常类完整
2. API错误响应格式统一
3. 日志分级分文件正确
4. 关键操作有日志记录
5. 前端错误处理完善
```

---

## Task 5.4: 测试覆盖

### AI Code Agent 提示词

```
请实现测试覆盖：

## 1. 测试配置

```python
# config/settings/test.py

from .base import *

DEBUG = False

# 使用内存数据库
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': ':memory:',
    }
}

# 使用本地内存缓存
CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
    }
}

# Celery同步执行
CELERY_TASK_ALWAYS_EAGER = True
CELERY_TASK_EAGER_PROPAGATES = True

# 禁用密码哈希加速测试
PASSWORD_HASHERS = [
    'django.contrib.auth.hashers.MD5PasswordHasher',
]

# 测试用的LLM mock
DEEPSEEK_API_KEY = 'test-key'
```

## 2. 测试基类和工具

```python
# tests/base.py

from rest_framework.test import APITestCase, APIClient
from django.contrib.auth import get_user_model
from unittest.mock import patch, AsyncMock

User = get_user_model()


class BaseAPITestCase(APITestCase):
    """API测试基类"""
    
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)
    
    def tearDown(self):
        User.objects.all().delete()


class MockLLMResponse:
    """Mock LLM响应"""
    
    @staticmethod
    def generate_index():
        return {
            "content": {
                "summary": "这是一篇关于微积分的文档",
                "sections": [{"title": "第一章", "summary": "基础概念"}],
                "concepts": [{"name": "导数", "type": "definition", "description": "函数的变化率"}],
                "keywords": ["微积分", "导数", "积分"],
                "difficulty": 3,
                "domain": "数学"
            }
        }
    
    @staticmethod
    def generate_plan():
        return {
            "content": {
                "intent": "用户想了解导数的定义",
                "needs_tools": True,
                "plan": ["搜索概念", "生成解释"],
                "estimated_tools": ["search_concepts", "generate_explanation"]
            }
        }


def mock_llm_client():
    """创建Mock LLM客户端"""
    mock = AsyncMock()
    mock.generate = AsyncMock(return_value=MockLLMResponse.generate_index())
    return mock
```

## 3. 用户系统测试

```python
# apps/users/tests.py

from django.urls import reverse
from rest_framework import status
from tests.base import BaseAPITestCase


class UserRegistrationTest(BaseAPITestCase):
    """用户注册测试"""
    
    def setUp(self):
        self.client.logout()  # 注册测试不需要认证
        self.register_url = reverse('register')
    
    def test_register_success(self):
        """成功注册"""
        data = {
            'email': 'newuser@example.com',
            'username': 'newuser',
            'password': 'StrongPass123!',
            'password_confirm': 'StrongPass123!'
        }
        response = self.client.post(self.register_url, data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(User.objects.filter(email='newuser@example.com').exists())
    
    def test_register_duplicate_email(self):
        """重复邮箱注册失败"""
        User.objects.create_user(
            email='existing@example.com',
            username='existing',
            password='pass123'
        )
        data = {
            'email': 'existing@example.com',
            'username': 'newuser',
            'password': 'StrongPass123!',
            'password_confirm': 'StrongPass123!'
        }
        response = self.client.post(self.register_url, data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
    
    def test_register_password_mismatch(self):
        """密码不匹配"""
        data = {
            'email': 'newuser@example.com',
            'username': 'newuser',
            'password': 'StrongPass123!',
            'password_confirm': 'DifferentPass123!'
        }
        response = self.client.post(self.register_url, data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class UserProfileTest(BaseAPITestCase):
    """用户画像测试"""
    
    def test_get_profile(self):
        """获取用户画像"""
        response = self.client.get(reverse('profile'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('education_level', response.data)
    
    def test_update_profile(self):
        """更新用户画像"""
        data = {
            'education_level': 'graduate',
            'major': '计算机科学',
            'math_level': 4
        }
        response = self.client.patch(reverse('profile'), data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['major'], '计算机科学')
```

## 4. 文档系统测试

```python
# apps/documents/tests.py

import io
from unittest.mock import patch
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework import status
from tests.base import BaseAPITestCase, mock_llm_client


class DocumentUploadTest(BaseAPITestCase):
    """文档上传测试"""
    
    def test_upload_markdown(self):
        """上传Markdown文件"""
        content = b'# Test Document\n\nThis is a test.'
        file = SimpleUploadedFile('test.md', content, content_type='text/markdown')
        
        with patch('apps.documents.tasks.process_document_task.delay'):
            response = self.client.post(
                '/api/documents/',
                {'file': file},
                format='multipart'
            )
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['title'], 'test')
        self.assertEqual(response.data['file_type'], 'md')
    
    def test_upload_invalid_type(self):
        """上传不支持的文件类型"""
        file = SimpleUploadedFile('test.exe', b'content', content_type='application/exe')
        
        response = self.client.post(
            '/api/documents/',
            {'file': file},
            format='multipart'
        )
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
    
    def test_upload_too_large(self):
        """上传过大的文件"""
        content = b'x' * (11 * 1024 * 1024)  # 11MB
        file = SimpleUploadedFile('test.md', content)
        
        response = self.client.post(
            '/api/documents/',
            {'file': file},
            format='multipart'
        )
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class DocumentProcessingTest(BaseAPITestCase):
    """文档处理测试"""
    
    @patch('core.llm.client.llm_client')
    def test_process_document(self, mock_llm):
        """测试文档处理流程"""
        mock_llm.generate = mock_llm_client().generate
        
        # 创建文档
        from apps.documents.models import Document
        doc = Document.objects.create(
            user=self.user,
            title='Test',
            file_type='md',
            status='processing'
        )
        doc.raw_content = '# Test\n\nContent here'
        doc.save()
        
        # 执行处理任务（同步）
        from apps.documents.tasks import process_document_task
        process_document_task(str(doc.id))
        
        # 验证结果
        doc.refresh_from_db()
        self.assertEqual(doc.status, 'ready')
        self.assertIsNotNone(doc.index_data)
        self.assertTrue(doc.chunks.exists())
```

## 5. Agent测试

```python
# apps/agent/tests.py

import pytest
from unittest.mock import patch, AsyncMock
from apps.agent.core.executor import ScholarAgent
from apps.agent.tools.registry import ToolRegistry
from tests.base import BaseAPITestCase


class ToolRegistryTest(BaseAPITestCase):
    """工具注册测试"""
    
    def test_tool_registration(self):
        """测试工具注册"""
        self.assertIn('search_concepts', ToolRegistry._tools)
        self.assertIn('generate_explanation', ToolRegistry._tools)
    
    def test_tool_schema(self):
        """测试工具Schema生成"""
        tool = ToolRegistry.get('search_concepts')
        schema = tool.get_schema()
        
        self.assertEqual(schema['name'], 'search_concepts')
        self.assertIn('description', schema)
        self.assertIn('parameters', schema)


@pytest.mark.asyncio
class AgentExecutorTest(BaseAPITestCase):
    """Agent执行器测试"""
    
    async def test_simple_query(self):
        """测试简单问答"""
        with patch('core.llm.client.llm_client') as mock_llm:
            mock_llm.generate = AsyncMock(return_value={
                "content": {
                    "intent": "直接回答",
                    "needs_tools": False,
                    "plan": []
                }
            })
            
            agent = ScholarAgent(
                user_id=self.user.id,
                conversation_id='test-conv'
            )
            
            events = []
            async for event in agent.run("你好", {}):
                events.append(event)
            
            # 验证有答案返回
            event_types = [e['type'] for e in events]
            self.assertIn('answer', event_types)
    
    async def test_tool_execution(self):
        """测试工具调用"""
        with patch('core.llm.client.llm_client') as mock_llm:
            # Mock规划返回
            mock_llm.generate = AsyncMock(side_effect=[
                {"content": {"intent": "查找概念", "needs_tools": True, "plan": ["搜索"]}},
                {"content": {"thought": "需要搜索", "action": "search_concepts", "action_input": {"query": "导数"}}},
                {"content": {"thought": "找到了", "final_answer": "导数是..."}}
            ])
            
            agent = ScholarAgent(
                user_id=self.user.id,
                conversation_id='test-conv'
            )
            
            events = []
            async for event in agent.run("什么是导数", {}):
                events.append(event)
            
            event_types = [e['type'] for e in events]
            self.assertIn('action', event_types)
            self.assertIn('answer', event_types)
```

## 6. 复习卡片算法测试

```python
# apps/knowledge/tests.py

from datetime import date, timedelta
from apps.knowledge.services.spaced_repetition import SM2Algorithm, FlashcardService
from tests.base import BaseAPITestCase


class SM2AlgorithmTest(BaseAPITestCase):
    """SM-2算法测试"""
    
    def test_first_review_again(self):
        """第一次复习选择"忘记了""""
        result = SM2Algorithm.calculate_next_review(
            rating=0,
            current_ease_factor=2.5,
            current_interval=0,
            current_repetitions=0
        )
        
        self.assertEqual(result.interval, 1)
        self.assertEqual(result.repetitions, 0)
        self.assertLess(result.ease_factor, 2.5)
    
    def test_first_review_good(self):
        """第一次复习选择"一般""""
        result = SM2Algorithm.calculate_next_review(
            rating=2,
            current_ease_factor=2.5,
            current_interval=0,
            current_repetitions=0
        )
        
        self.assertEqual(result.interval, 1)
        self.assertEqual(result.repetitions, 1)
    
    def test_second_review_good(self):
        """第二次复习选择"一般""""
        result = SM2Algorithm.calculate_next_review(
            rating=2,
            current_ease_factor=2.5,
            current_interval=1,
            current_repetitions=1
        )
        
        self.assertEqual(result.interval, 6)
        self.assertEqual(result.repetitions, 2)
    
    def test_subsequent_review(self):
        """后续复习间隔增长"""
        result = SM2Algorithm.calculate_next_review(
            rating=2,
            current_ease_factor=2.5,
            current_interval=6,
            current_repetitions=2
        )
        
        self.assertEqual(result.interval, 15)  # 6 * 2.5 = 15
        self.assertEqual(result.repetitions, 3)
    
    def test_easy_bonus(self):
        """简单评分获得额外间隔"""
        result = SM2Algorithm.calculate_next_review(
            rating=3,
            current_ease_factor=2.5,
            current_interval=6,
            current_repetitions=2
        )
        
        # 简单应该比一般间隔更长
        self.assertGreater(result.interval, 15)
    
    def test_min_ease_factor(self):
        """简易度因子最小值"""
        result = SM2Algorithm.calculate_next_review(
            rating=0,
            current_ease_factor=1.3,  # 已经是最小值
            current_interval=1,
            current_repetitions=0
        )
        
        self.assertEqual(result.ease_factor, 1.3)


class FlashcardServiceTest(BaseAPITestCase):
    """复习卡片服务测试"""
    
    def setUp(self):
        super().setUp()
        from apps.knowledge.models import Flashcard
        
        # 创建测试卡片
        self.due_card = Flashcard.objects.create(
            user=self.user,
            front='问题1',
            back='答案1',
            next_review_date=date.today() - timedelta(days=1)
        )
        self.future_card = Flashcard.objects.create(
            user=self.user,
            front='问题2',
            back='答案2',
            next_review_date=date.today() + timedelta(days=7)
        )
        self.new_card = Flashcard.objects.create(
            user=self.user,
            front='问题3',
            back='答案3',
            next_review_date=None
        )
    
    def test_get_due_cards(self):
        """获取待复习卡片"""
        service = FlashcardService(self.user.id)
        due_cards = list(service.get_due_cards())
        
        # 应该包含逾期卡片和新卡片
        self.assertEqual(len(due_cards), 2)
        self.assertIn(self.due_card, due_cards)
        self.assertIn(self.new_card, due_cards)
        self.assertNotIn(self.future_card, due_cards)
    
    def test_review_card(self):
        """复习卡片"""
        service = FlashcardService(self.user.id)
        
        result = service.review_card(
            card_id=str(self.due_card.id),
            rating=2,
            response_time=3000
        )
        
        self.due_card.refresh_from_db()
        self.assertEqual(self.due_card.total_reviews, 1)
        self.assertIsNotNone(self.due_card.next_review_date)
```

## 7. 运行测试

```bash
# 运行所有测试
python manage.py test --settings=config.settings.test

# 运行特定应用测试
python manage.py test apps.users --settings=config.settings.test

# 使用pytest
pip install pytest pytest-django pytest-asyncio pytest-cov

# pytest配置 (pytest.ini)
[pytest]
DJANGO_SETTINGS_MODULE = config.settings.test
python_files = tests.py test_*.py
asyncio_mode = auto

# 运行并生成覆盖率报告
pytest --cov=apps --cov-report=html

# 前端测试
cd frontend
npm install -D vitest @testing-library/react @testing-library/jest-dom
npm run test
```

## 验收标准
1. 用户系统测试通过
2. 文档系统测试通过
3. Agent测试通过
4. 复习算法测试通过
5. 测试覆盖率 > 70%
```

---

## Phase 5 完成检查清单

- [ ] 数据库优化完成
  - [ ] 索引添加
  - [ ] 查询优化（select_related/prefetch_related）
  - [ ] 分页配置
- [ ] 缓存策略实现
  - [ ] Redis配置
  - [ ] 视图级缓存
  - [ ] 用户数据缓存
  - [ ] LLM响应缓存
- [ ] 错误处理完善
  - [ ] 自定义异常类
  - [ ] 全局异常处理器
  - [ ] 统一错误响应格式
- [ ] 日志系统配置
  - [ ] 分级日志
  - [ ] JSON格式日志
  - [ ] 关键操作记录
- [ ] 测试覆盖
  - [ ] 用户系统测试
  - [ ] 文档系统测试
  - [ ] Agent测试
  - [ ] 复习算法测试
  - [ ] 覆盖率 > 70%
- [ ] 前端错误处理
  - [ ] API错误拦截
  - [ ] ErrorBoundary组件
  - [ ] 用户友好提示
