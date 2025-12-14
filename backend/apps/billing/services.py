from __future__ import annotations

import logging
from typing import Optional, Dict, Any, TYPE_CHECKING
from django.contrib.auth import get_user_model
from django.db import transaction
from django.utils import timezone

from .models import UserTokenUsage, SystemTokenUsage, TokenUsageRecord

if TYPE_CHECKING:
    from django.contrib.auth.models import User

User = get_user_model()
logger = logging.getLogger(__name__)


class TokenUsageService:
    """Token使用记录服务"""

    @staticmethod
    @transaction.atomic
    def record_token_usage(
        user: User,
        input_tokens: int,
        output_tokens: int,
        api_type: str = 'other',
        metadata: Optional[Dict[str, Any]] = None
    ) -> TokenUsageRecord:
        """
        记录token使用情况

        Args:
            user: 用户对象
            input_tokens: 输入token数量
            output_tokens: 输出token数量
            api_type: API类型
            metadata: 额外元数据

        Returns:
            TokenUsageRecord: 创建的记录对象
        """
        try:
            # 创建详细记录
            record = TokenUsageRecord.objects.create(
                user=user,
                api_type=api_type,
                input_tokens=input_tokens,
                output_tokens=output_tokens,
                metadata=metadata or {}
            )

            # 更新用户统计
            user_usage, created = UserTokenUsage.objects.get_or_create(user=user)
            user_usage.add_usage(input_tokens, output_tokens)

            # 更新系统统计
            system_usage = SystemTokenUsage.get_or_create_today()
            system_usage.add_usage(input_tokens, output_tokens)

            logger.info(
                f"Token usage recorded: user={user.username}, "
                f"input={input_tokens}, output={output_tokens}, "
                f"api_type={api_type}"
            )

            return record

        except Exception as e:
            logger.error(f"Failed to record token usage: {e}")
            raise

    @staticmethod
    def get_user_token_usage(user: User) -> Dict[str, Any]:
        """
        获取用户的token使用统计

        Args:
            user: 用户对象

        Returns:
            Dict: 用户token使用统计数据
        """
        try:
            usage, created = UserTokenUsage.objects.get_or_create(user=user)
            return {
                'total_input_tokens': usage.total_input_tokens,
                'total_output_tokens': usage.total_output_tokens,
                'total_tokens': usage.total_tokens,
                'api_call_count': usage.api_call_count,
                'last_updated': usage.last_updated.isoformat() if usage.last_updated else None
            }
        except Exception as e:
            logger.error(f"Failed to get user token usage: {e}")
            return {
                'total_input_tokens': 0,
                'total_output_tokens': 0,
                'total_tokens': 0,
                'api_call_count': 0,
                'last_updated': None
            }

    @staticmethod
    def get_system_token_usage(date: Optional[str] = None) -> Dict[str, Any]:
        """
        获取系统token使用统计

        Args:
            date: 指定日期 (YYYY-MM-DD)，如果为None则返回今天的数据

        Returns:
            Dict: 系统token使用统计数据
        """
        try:
            if date:
                target_date = timezone.datetime.fromisoformat(date).date()
                usage = SystemTokenUsage.objects.filter(date=target_date).first()
                if not usage:
                    return {
                        'date': date,
                        'daily_input_tokens': 0,
                        'daily_output_tokens': 0,
                        'daily_total_tokens': 0,
                        'daily_api_calls': 0,
                        'total_input_tokens': 0,
                        'total_output_tokens': 0,
                        'total_tokens': 0,
                        'total_api_calls': 0
                    }
            else:
                usage = SystemTokenUsage.get_or_create_today()

            return {
                'date': usage.date.isoformat(),
                'daily_input_tokens': usage.daily_input_tokens,
                'daily_output_tokens': usage.daily_output_tokens,
                'daily_total_tokens': usage.daily_total_tokens,
                'daily_api_calls': usage.daily_api_calls,
                'total_input_tokens': usage.total_input_tokens,
                'total_output_tokens': usage.total_output_tokens,
                'total_tokens': usage.total_tokens,
                'total_api_calls': usage.total_api_calls
            }
        except Exception as e:
            logger.error(f"Failed to get system token usage: {e}")
            return {
                'date': date or timezone.now().date().isoformat(),
                'daily_input_tokens': 0,
                'daily_output_tokens': 0,
                'daily_total_tokens': 0,
                'daily_api_calls': 0,
                'total_input_tokens': 0,
                'total_output_tokens': 0,
                'total_tokens': 0,
                'total_api_calls': 0
            }

    @staticmethod
    def get_user_token_records(
        user: User,
        api_type: Optional[str] = None,
        limit: int = 50
    ) -> list:
        """
        获取用户的token使用记录

        Args:
            user: 用户对象
            api_type: API类型过滤
            limit: 返回记录数量限制

        Returns:
            List: token使用记录列表
        """
        try:
            queryset = TokenUsageRecord.objects.filter(user=user)
            if api_type:
                queryset = queryset.filter(api_type=api_type)

            records = queryset.order_by('-created_at')[:limit]

            return [{
                'id': record.id,
                'api_type': record.api_type,
                'input_tokens': record.input_tokens,
                'output_tokens': record.output_tokens,
                'total_tokens': record.total_tokens,
                'created_at': record.created_at.isoformat(),
                'metadata': record.metadata
            } for record in records]

        except Exception as e:
            logger.error(f"Failed to get user token records: {e}")
            return []

    @staticmethod
    def get_top_users_by_token_usage(limit: int = 10) -> list:
        """
        获取token使用量最多的用户

        Args:
            limit: 返回用户数量限制

        Returns:
            List: 用户token使用统计列表
        """
        try:
            usages = UserTokenUsage.objects.order_by('-total_tokens')[:limit]

            return [{
                'user_id': usage.user.id,
                'username': usage.user.username,
                'total_input_tokens': usage.total_input_tokens,
                'total_output_tokens': usage.total_output_tokens,
                'total_tokens': usage.total_tokens,
                'api_call_count': usage.api_call_count,
                'last_updated': usage.last_updated.isoformat() if usage.last_updated else None
            } for usage in usages]

        except Exception as e:
            logger.error(f"Failed to get top users by token usage: {e}")
            return []
