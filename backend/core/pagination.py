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