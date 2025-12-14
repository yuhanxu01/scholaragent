from django.core.management.base import BaseCommand, CommandError
from django.contrib.auth import get_user_model
from django.utils import timezone
from django.db import models
from apps.billing.services import TokenUsageService
from apps.billing.models import UserTokenUsage, SystemTokenUsage, TokenUsageRecord

User = get_user_model()


class Command(BaseCommand):
    help = '显示token使用统计信息'

    def add_arguments(self, parser):
        parser.add_argument(
            '--user',
            type=str,
            help='指定用户ID或用户名查看用户统计',
        )
        parser.add_argument(
            '--date',
            type=str,
            help='指定日期查看系统统计 (YYYY-MM-DD)',
        )
        parser.add_argument(
            '--top-users',
            type=int,
            default=10,
            help='显示token使用最多的用户数量',
        )
        parser.add_argument(
            '--recent',
            type=int,
            help='显示最近N条token使用记录',
        )

    def handle(self, *args, **options):
        if options['user']:
            self.show_user_stats(options['user'])
        elif options['date']:
            self.show_system_stats(options['date'])
        elif options['recent']:
            self.show_recent_records(options['recent'])
        else:
            self.show_overview(options['top_users'])

    def show_overview(self, top_users_count):
        """显示总览统计"""
        self.stdout.write(
            self.style.SUCCESS('=== ScholarMind Token 使用统计总览 ===\n')
        )

        # 系统统计
        system_stats = TokenUsageService.get_system_token_usage()
        self.stdout.write('系统统计:')
        self.stdout.write(f'  总输入token: {system_stats["total_input_tokens"]:,}')
        self.stdout.write(f'  总输出token: {system_stats["total_output_tokens"]:,}')
        self.stdout.write(f'  总token数: {system_stats["total_tokens"]:,}')
        self.stdout.write(f'  总API调用: {system_stats["total_api_calls"]:,}')

        # 今日统计
        today = timezone.now().date()
        today_stats = TokenUsageService.get_system_token_usage(str(today))
        self.stdout.write(f'\n今日统计 ({today}):')
        self.stdout.write(f'  输入token: {today_stats["daily_input_tokens"]:,}')
        self.stdout.write(f'  输出token: {today_stats["daily_output_tokens"]:,}')
        self.stdout.write(f'  总token数: {today_stats["daily_total_tokens"]:,}')
        self.stdout.write(f'  API调用: {today_stats["daily_api_calls"]:,}')

        # 用户统计
        top_users = TokenUsageService.get_top_users_by_token_usage(top_users_count)
        if top_users:
            self.stdout.write(f'\nToken使用最多的{len(top_users)}位用户:')
            for i, user in enumerate(top_users, 1):
                self.stdout.write(
                    f'  {i}. {user["username"]} - {user["total_tokens"]:,} tokens '
                    f'({user["api_call_count"]}次调用)'
                )

        # API类型统计
        api_stats = TokenUsageRecord.objects.values('api_type').annotate(
            total_tokens=models.Sum('total_tokens'),
            count=models.Count('id')
        ).order_by('-total_tokens')

        self.stdout.write('\nAPI类型统计:')
        for stat in api_stats:
            self.stdout.write(
                f'  {stat["api_type"]}: {stat["total_tokens"] or 0:,} tokens '
                f'({stat["count"]}次调用)'
            )

    def show_user_stats(self, user_identifier):
        """显示用户统计"""
        try:
            # 尝试按ID查找
            try:
                user = User.objects.get(id=user_identifier)
            except ValueError:
                # 按用户名查找
                user = User.objects.get(username=user_identifier)

            self.stdout.write(
                self.style.SUCCESS(f'=== 用户 {user.username} Token使用统计 ===\n')
            )

            user_stats = TokenUsageService.get_user_token_usage(user)
            self.stdout.write(f'总输入token: {user_stats["total_input_tokens"]:,}')
            self.stdout.write(f'总输出token: {user_stats["total_output_tokens"]:,}')
            self.stdout.write(f'总token数: {user_stats["total_tokens"]:,}')
            self.stdout.write(f'API调用次数: {user_stats["api_call_count"]:,}')
            self.stdout.write(f'最后更新: {user_stats["last_updated"]}')

            # 用户最近记录
            recent_records = TokenUsageService.get_user_token_records(user, limit=10)
            if recent_records:
                self.stdout.write(f'\n最近10条记录:')
                for record in recent_records:
                    self.stdout.write(
                        f'  {record["created_at"]} - {record["api_type"]} - '
                        f'{record["total_tokens"]} tokens'
                    )

        except User.DoesNotExist:
            raise CommandError(f'用户 "{user_identifier}" 不存在')

    def show_system_stats(self, date_str):
        """显示指定日期的系统统计"""
        try:
            stats = TokenUsageService.get_system_token_usage(date_str)
            self.stdout.write(
                self.style.SUCCESS(f'=== {date_str} 系统Token使用统计 ===\n')
            )
            self.stdout.write(f'输入token: {stats["daily_input_tokens"]:,}')
            self.stdout.write(f'输出token: {stats["daily_output_tokens"]:,}')
            self.stdout.write(f'总token数: {stats["daily_total_tokens"]:,}')
            self.stdout.write(f'API调用: {stats["daily_api_calls"]:,}')
        except Exception as e:
            raise CommandError(f'获取日期 {date_str} 的统计失败: {e}')

    def show_recent_records(self, count):
        """显示最近的token使用记录"""
        records = TokenUsageRecord.objects.select_related('user').order_by('-created_at')[:count]

        self.stdout.write(
            self.style.SUCCESS(f'=== 最近{count}条Token使用记录 ===\n')
        )

        for record in records:
            self.stdout.write(
                f'{record.created_at} - {record.user.username} - {record.api_type} - '
                f'{record.total_tokens} tokens ({record.input_tokens}+{record.output_tokens})'
            )