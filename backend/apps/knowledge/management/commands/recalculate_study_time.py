"""
管理命令：重新计算用户学习时间统计
用于数据修复和批量更新
"""
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.db.models import Sum
from apps.knowledge.models import StudySession

User = get_user_model()


class Command(BaseCommand):
    help = '重新计算所有用户的学习时间统计'

    def add_arguments(self, parser):
        parser.add_argument(
            '--user-id',
            type=str,
            help='指定用户ID，只更新该用户的学习时间'
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='预览模式，不实际更新数据'
        )

    def handle(self, *args, **options):
        user_id = options.get('user_id')
        dry_run = options.get('dry_run', False)

        if user_id:
            # 更新指定用户
            users = User.objects.filter(id=user_id)
            if not users.exists():
                self.stdout.write(
                    self.style.ERROR(f'用户ID {user_id} 不存在')
                )
                return
        else:
            # 更新所有用户
            users = User.objects.all()

        total_users = users.count()
        self.stdout.write(f'开始处理 {total_users} 个用户...')

        updated_count = 0
        error_count = 0

        for user in users:
            try:
                # 计算该用户所有已完成会话的总学习时间
                total_duration = StudySession.objects.filter(
                    user=user,
                    end_time__isnull=False,
                    duration__isnull=False
                ).aggregate(
                    total=Sum('duration')
                )['total'] or 0

                # 转换为小时
                total_hours = total_duration / 3600.0

                if dry_run:
                    self.stdout.write(
                        f'用户 {user.username}: 当前 {user.profile.study_time_hours:.2f}小时, '
                        f'应为 {total_hours:.2f}小时'
                    )
                else:
                    # 更新用户档案
                    old_hours = user.profile.study_time_hours
                    user.profile.study_time_hours = total_hours
                    user.profile.save(update_fields=['study_time_hours'])

                    if old_hours != total_hours:
                        updated_count += 1
                        self.stdout.write(
                            f'用户 {user.username}: {old_hours:.2f}小时 -> {total_hours:.2f}小时'
                        )
                    else:
                        self.stdout.write(
                            f'用户 {user.username}: 无变化 ({total_hours:.2f}小时)'
                        )

            except Exception as e:
                error_count += 1
                self.stdout.write(
                    self.style.ERROR(f'用户 {user.username} 处理失败: {str(e)}')
                )

        # 输出总结
        if dry_run:
            self.stdout.write(
                self.style.SUCCESS(f'预览完成！共 {total_users} 个用户')
            )
        else:
            self.stdout.write(
                self.style.SUCCESS(
                    f'更新完成！成功: {updated_count}, 错误: {error_count}, '
                    f'总计: {total_users}'
                )
            )