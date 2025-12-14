from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from apps.billing.services import TokenUsageService
from apps.billing.models import UserTokenUsage, SystemTokenUsage, TokenUsageRecord
import json
from datetime import datetime

User = get_user_model()

class Command(BaseCommand):
    help = '测试Token统计功能'

    def handle(self, *args, **options):
        self.stdout.write("🚀 开始Token统计功能测试...")
        self.stdout.write("=" * 50)

        # 1. 创建测试用户
        test_user = self.create_test_user()
        
        # 2. 清理现有数据
        self.cleanup_test_data(test_user)
        
        # 3. 测试Token记录功能
        self.test_token_recording(test_user)
        
        # 4. 测试统计功能
        self.test_statistics(test_user)
        
        # 5. 生成报告
        self.generate_report(test_user)
        
        self.stdout.write("=" * 50)
        self.stdout.write(self.style.SUCCESS("🎉 Token统计功能测试完成！"))

    def create_test_user(self):
        """创建测试用户"""
        self.stdout.write("🔧 创建测试用户...")
        
        test_user, created = User.objects.get_or_create(
            username='token_test_user',
            defaults={
                'email': 'token_test@example.com',
                'first_name': 'Token',
                'last_name': 'Test'
            }
        )
        
        if created:
            test_user.set_password('testpass123')
            test_user.save()
            self.stdout.write(self.style.SUCCESS(f"✅ 创建了新测试用户: {test_user.username}"))
        else:
            self.stdout.write(self.style.SUCCESS(f"✅ 使用现有测试用户: {test_user.username}"))
        
        return test_user

    def cleanup_test_data(self, user):
        """清理测试数据"""
        self.stdout.write("\n🧹 清理测试数据...")
        
        # 删除现有的测试记录
        deleted_records = TokenUsageRecord.objects.filter(user=user).delete()[0]
        deleted_stats = UserTokenUsage.objects.filter(user=user).delete()[0]
        
        self.stdout.write(f"  🗑️ 删除了 {deleted_records} 条Token记录")
        self.stdout.write(f"  🗑️ 删除了 {deleted_stats} 条用户统计")

    def test_token_recording(self, user):
        """测试Token记录功能"""
        self.stdout.write("\n📊 测试Token记录功能...")
        
        test_cases = [
            {'input_tokens': 100, 'output_tokens': 50, 'api_type': 'ai_chat'},
            {'input_tokens': 200, 'output_tokens': 100, 'api_type': 'agent_execution'},
            {'input_tokens': 150, 'output_tokens': 75, 'api_type': 'document_index'},
            {'input_tokens': 80, 'output_tokens': 40, 'api_type': 'other'},
        ]
        
        for i, case in enumerate(test_cases, 1):
            record = TokenUsageService.record_token_usage(
                user=user,
                input_tokens=case['input_tokens'],
                output_tokens=case['output_tokens'],
                api_type=case['api_type'],
                metadata={'test_case': i, 'timestamp': datetime.now().isoformat()}
            )
            self.stdout.write(f"  ✅ 创建记录 {i}: {case['api_type']} - {record.total_tokens} tokens")
        
        self.stdout.write(self.style.SUCCESS("✅ Token记录功能测试完成"))

    def test_statistics(self, user):
        """测试统计功能"""
        self.stdout.write("\n🔍 测试统计功能...")
        
        # 获取用户统计
        user_stats = TokenUsageService.get_user_token_usage(user)
        self.stdout.write(f"  📈 用户统计:")
        self.stdout.write(f"    - 总输入Token: {user_stats['total_input_tokens']}")
        self.stdout.write(f"    - 总输出Token: {user_stats['total_output_tokens']}")
        self.stdout.write(f"    - 总Token数: {user_stats['total_tokens']}")
        self.stdout.write(f"    - API调用次数: {user_stats['api_call_count']}")
        
        # 获取用户记录
        user_records = TokenUsageService.get_user_token_records(user, limit=10)
        self.stdout.write(f"  📋 用户记录数量: {len(user_records)}")
        
        # 获取系统统计
        system_stats = TokenUsageService.get_system_token_usage()
        self.stdout.write(f"  🌐 系统统计:")
        self.stdout.write(f"    - 今日日期: {system_stats['date']}")
        self.stdout.write(f"    - 今日Token数: {system_stats['daily_total_tokens']}")
        
        self.stdout.write(self.style.SUCCESS("✅ 统计功能测试完成"))

    def generate_report(self, user):
        """生成测试报告"""
        self.stdout.write("\n📄 生成测试报告...")
        
        # 获取数据库中的统计数据
        total_users = User.objects.count()
        total_user_stats = UserTokenUsage.objects.count()
        total_system_stats = SystemTokenUsage.objects.count()
        total_records = TokenUsageRecord.objects.count()
        
        # 获取测试用户的详细统计
        user_stats = TokenUsageService.get_user_token_usage(user)
        user_records = TokenUsageService.get_user_token_records(user)
        
        report = {
            '测试时间': datetime.now().isoformat(),
            '数据库统计': {
                '用户总数': total_users,
                '用户统计记录数': total_user_stats,
                '系统统计记录数': total_system_stats,
                'Token使用记录数': total_records,
            },
            '测试用户': {
                '用户名': user.username,
                '邮箱': user.email,
            },
            '测试用户统计': {
                '总输入Token': user_stats['total_input_tokens'],
                '总输出Token': user_stats['total_output_tokens'],
                '总Token数': user_stats['total_tokens'],
                'API调用次数': user_stats['api_call_count'],
                '记录数量': len(user_records),
            }
        }
        
        # 保存报告到文件
        report_file = f'token_stats_report_{datetime.now().strftime("%Y%m%d_%H%M%S")}.json'
        
        with open(report_file, 'w', encoding='utf-8') as f:
            json.dump(report, f, ensure_ascii=False, indent=2)
        
        self.stdout.write(self.style.SUCCESS(f"  ✅ 测试报告已保存到: {report_file}"))
        self.stdout.write(f"  📊 测试用户总Token数: {user_stats['total_tokens']}")
        self.stdout.write(f"  📝 测试用户记录数: {len(user_records)}")