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