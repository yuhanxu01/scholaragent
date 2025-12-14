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