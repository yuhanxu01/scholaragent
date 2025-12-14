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