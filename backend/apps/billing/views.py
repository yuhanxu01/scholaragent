import logging
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone

from .services import TokenUsageService

logger = logging.getLogger(__name__)


class TokenUsageViewSet(viewsets.ViewSet):
    """Token使用统计视图集"""
    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=['get'])
    def user_stats(self, request):
        """获取当前用户的token使用统计"""
        try:
            logger.info(f"Getting user stats for user: {request.user.username} (ID: {request.user.id})")
            stats = TokenUsageService.get_user_token_usage(request.user)
            logger.info(f"Successfully retrieved user stats for {request.user.username}: {stats}")
            return Response(stats)
        except Exception as e:
            logger.error(f"Failed to get user stats for user {request.user.username}: {str(e)}", exc_info=True)
            return Response(
                {'error': f'获取用户统计失败: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['get'])
    def system_stats(self, request):
        """获取系统token使用统计"""
        try:
            date = request.query_params.get('date')
            logger.info(f"Getting system stats for date: {date or 'today'}")
            stats = TokenUsageService.get_system_token_usage(date)
            logger.info(f"Successfully retrieved system stats for date {date or 'today'}: {stats}")
            return Response(stats)
        except Exception as e:
            logger.error(f"Failed to get system stats for date {date or 'today'}: {str(e)}", exc_info=True)
            return Response(
                {'error': f'获取系统统计失败: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['get'])
    def user_records(self, request):
        """获取当前用户的token使用记录"""
        try:
            api_type = request.query_params.get('api_type')
            limit = int(request.query_params.get('limit', 20))
            logger.info(f"Getting user records for user: {request.user.username}, api_type: {api_type}, limit: {limit}")
            records = TokenUsageService.get_user_token_records(
                request.user, api_type=api_type, limit=limit
            )
            logger.info(f"Successfully retrieved {len(records)} user records for {request.user.username}")
            return Response(records)
        except ValueError as e:
            logger.warning(f"Invalid parameter in user_records request: {str(e)}")
            return Response(
                {'error': '参数错误'},
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            logger.error(f"Failed to get user records for user {request.user.username}: {str(e)}", exc_info=True)
            return Response(
                {'error': f'获取用户记录失败: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['get'])
    def dashboard_stats(self, request):
        """获取仪表板统计数据"""
        try:
            logger.info(f"Getting dashboard stats for user: {request.user.username}")
            
            # 用户统计
            user_stats = TokenUsageService.get_user_token_usage(request.user)
            logger.debug(f"User stats retrieved: {user_stats}")

            # 今日系统统计
            today = timezone.now().date()
            today_stats = TokenUsageService.get_system_token_usage(str(today))
            logger.debug(f"Today system stats retrieved: {today_stats}")

            # 用户最近记录
            recent_records = TokenUsageService.get_user_token_records(
                request.user, limit=5
            )
            logger.debug(f"Recent records retrieved: {len(recent_records)} records")

            dashboard_data = {
                'user_stats': user_stats,
                'today_stats': today_stats,
                'recent_records': recent_records
            }
            logger.info(f"Successfully retrieved dashboard stats for {request.user.username}")
            return Response(dashboard_data)
        except Exception as e:
            logger.error(f"Failed to get dashboard stats for user {request.user.username}: {str(e)}", exc_info=True)
            return Response(
                {'error': f'获取仪表板统计失败: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )