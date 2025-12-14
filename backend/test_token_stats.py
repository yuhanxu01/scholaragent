#!/usr/bin/env python
"""
Token统计功能测试脚本

这个脚本用于测试ScholarAgent项目中的Token统计功能，包括：
1. 创建测试用户
2. 记录Token使用
3. 验证统计数据
4. 测试API端点

使用方法:
python test_token_stats.py
"""

import os
import sys
import django
import requests
import json
from datetime import datetime, timedelta

# 设置Django环境
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# 先设置Django，再导入模型
django.setup()

from django.contrib.auth import get_user_model
from apps.billing.services import TokenUsageService
from apps.billing.models import UserTokenUsage, SystemTokenUsage, TokenUsageRecord

User = get_user_model()

class TokenStatsTester:
    def __init__(self):
        self.base_url = 'http://localhost:8000/api'
        self.test_user = None
        self.access_token = None
        
    def setup_test_user(self):
        """设置测试用户"""
        print("🔧 设置测试用户...")
        
        # 创建或获取测试用户
        self.test_user, created = User.objects.get_or_create(
            username='token_test_user',
            defaults={
                'email': 'token_test@example.com',
                'first_name': 'Token',
                'last_name': 'Test'
            }
        )
        
        if created:
            self.test_user.set_password('testpass123')
            self.test_user.save()
            print(f"✅ 创建了新测试用户: {self.test_user.username}")
        else:
            print(f"✅ 使用现有测试用户: {self.test_user.username}")
        
        return self.test_user
    
    def authenticate_user(self):
        """认证用户并获取访问令牌"""
        print("\n🔐 认证测试用户...")
        
        auth_data = {
            'email': self.test_user.email,
            'password': 'testpass123'
        }
        
        try:
            response = requests.post(f'{self.base_url}/token/', json=auth_data)
            if response.status_code == 200:
                token_data = response.json()
                self.access_token = token_data['access']
                print("✅ 用户认证成功")
                return True
            else:
                print(f"❌ 认证失败: {response.status_code} - {response.text}")
                return False
        except Exception as e:
            print(f"❌ 认证请求失败: {e}")
            return False
    
    def test_token_recording(self):
        """测试Token记录功能"""
        print("\n📊 测试Token记录功能...")
        
        try:
            # 清理现有的测试数据
            TokenUsageRecord.objects.filter(user=self.test_user).delete()
            UserTokenUsage.objects.filter(user=self.test_user).delete()
            
            # 创建多个测试记录
            test_cases = [
                {'input_tokens': 100, 'output_tokens': 50, 'api_type': 'ai_chat'},
                {'input_tokens': 200, 'output_tokens': 100, 'api_type': 'agent_execution'},
                {'input_tokens': 150, 'output_tokens': 75, 'api_type': 'document_index'},
                {'input_tokens': 80, 'output_tokens': 40, 'api_type': 'other'},
            ]
            
            for i, case in enumerate(test_cases, 1):
                record = TokenUsageService.record_token_usage(
                    user=self.test_user,
                    input_tokens=case['input_tokens'],
                    output_tokens=case['output_tokens'],
                    api_type=case['api_type'],
                    metadata={'test_case': i, 'timestamp': datetime.now().isoformat()}
                )
                print(f"  ✅ 创建记录 {i}: {case['api_type']} - {record.total_tokens} tokens")
            
            print("✅ Token记录功能测试完成")
            return True
            
        except Exception as e:
            print(f"❌ Token记录功能测试失败: {e}")
            return False
    
    def test_database_stats(self):
        """测试数据库统计功能"""
        print("\n🔍 测试数据库统计功能...")
        
        try:
            # 获取用户统计
            user_stats = TokenUsageService.get_user_token_usage(self.test_user)
            print(f"  📈 用户统计:")
            print(f"    - 总输入Token: {user_stats['total_input_tokens']}")
            print(f"    - 总输出Token: {user_stats['total_output_tokens']}")
            print(f"    - 总Token数: {user_stats['total_tokens']}")
            print(f"    - API调用次数: {user_stats['api_call_count']}")
            
            # 获取用户记录
            user_records = TokenUsageService.get_user_token_records(self.test_user, limit=10)
            print(f"  📋 用户记录数量: {len(user_records)}")
            
            # 获取系统统计
            system_stats = TokenUsageService.get_system_token_usage()
            print(f"  🌐 系统统计:")
            print(f"    - 今日日期: {system_stats['date']}")
            print(f"    - 今日Token数: {system_stats['daily_total_tokens']}")
            
            print("✅ 数据库统计功能测试完成")
            return True
            
        except Exception as e:
            print(f"❌ 数据库统计功能测试失败: {e}")
            return False
    
    def test_api_endpoints(self):
        """测试API端点"""
        print("\n🌐 测试API端点...")
        
        if not self.access_token:
            print("❌ 缺少访问令牌，跳过API测试")
            return False
        
        headers = {
            'Authorization': f'Bearer {self.access_token}',
            'Content-Type': 'application/json'
        }
        
        endpoints = [
            ('/billing/token-usage/user_stats/', '用户统计'),
            ('/billing/token-usage/system_stats/', '系统统计'),
            ('/billing/token-usage/user_records/', '用户记录'),
            ('/billing/token-usage/dashboard_stats/', '仪表板统计'),
        ]
        
        success_count = 0
        
        for endpoint, description in endpoints:
            try:
                response = requests.get(f'{self.base_url}{endpoint}', headers=headers)
                if response.status_code == 200:
                    data = response.json()
                    print(f"  ✅ {description} - 成功")
                    
                    # 验证数据结构
                    if 'user_stats' in data:
                        print(f"    📊 用户Token总数: {data['user_stats'].get('total_tokens', 0)}")
                    if 'today_stats' in data:
                        print(f"    📅 今日Token数: {data['today_stats'].get('daily_total_tokens', 0)}")
                    if 'recent_records' in data:
                        print(f"    📝 最近记录数: {len(data['recent_records'])}")
                    if 'total_tokens' in data:
                        print(f"    🔢 Token总数: {data['total_tokens']}")
                    
                    success_count += 1
                else:
                    print(f"  ❌ {description} - 失败 ({response.status_code}): {response.text}")
            except Exception as e:
                print(f"  ❌ {description} - 异常: {e}")
        
        print(f"✅ API端点测试完成: {success_count}/{len(endpoints)} 成功")
        return success_count == len(endpoints)
    
    def test_error_handling(self):
        """测试错误处理"""
        print("\n⚠️ 测试错误处理...")
        
        # 测试未认证访问
        try:
            response = requests.get(f'{self.base_url}/billing/token-usage/user_stats/')
            if response.status_code == 401:
                print("  ✅ 未认证访问正确返回401")
            else:
                print(f"  ❌ 未认证访问应返回401，实际返回{response.status_code}")
        except Exception as e:
            print(f"  ❌ 未认证访问测试异常: {e}")
        
        # 测试无效令牌
        try:
            headers = {'Authorization': 'Bearer invalid_token'}
            response = requests.get(f'{self.base_url}/billing/token-usage/user_stats/', headers=headers)
            if response.status_code == 401:
                print("  ✅ 无效令牌正确返回401")
            else:
                print(f"  ❌ 无效令牌应返回401，实际返回{response.status_code}")
        except Exception as e:
            print(f"  ❌ 无效令牌测试异常: {e}")
        
        print("✅ 错误处理测试完成")
        return True
    
    def generate_report(self):
        """生成测试报告"""
        print("\n📄 生成测试报告...")
        
        try:
            # 获取数据库中的统计数据
            total_users = User.objects.count()
            total_user_stats = UserTokenUsage.objects.count()
            total_system_stats = SystemTokenUsage.objects.count()
            total_records = TokenUsageRecord.objects.count()
            
            report = {
                '测试时间': datetime.now().isoformat(),
                '数据库统计': {
                    '用户总数': total_users,
                    '用户统计记录数': total_user_stats,
                    '系统统计记录数': total_system_stats,
                    'Token使用记录数': total_records,
                },
                '测试用户': {
                    '用户名': self.test_user.username,
                    '邮箱': self.test_user.email,
                }
            }
            
            # 获取测试用户的详细统计
            user_stats = TokenUsageService.get_user_token_usage(self.test_user)
            user_records = TokenUsageService.get_user_token_records(self.test_user)
            
            report['测试用户统计'] = {
                '总输入Token': user_stats['total_input_tokens'],
                '总输出Token': user_stats['total_output_tokens'],
                '总Token数': user_stats['total_tokens'],
                'API调用次数': user_stats['api_call_count'],
                '记录数量': len(user_records),
            }
            
            # 保存报告到文件
            report_file = f'token_stats_report_{datetime.now().strftime("%Y%m%d_%H%M%S")}.json'
            with open(report_file, 'w', encoding='utf-8') as f:
                json.dump(report, f, ensure_ascii=False, indent=2)
            
            print(f"  ✅ 测试报告已保存到: {report_file}")
            print(f"  📊 测试用户总Token数: {user_stats['total_tokens']}")
            print(f"  📝 测试用户记录数: {len(user_records)}")
            
            return report_file
            
        except Exception as e:
            print(f"  ❌ 生成报告失败: {e}")
            return None
    
    def run_all_tests(self):
        """运行所有测试"""
        print("🚀 开始Token统计功能测试...")
        print("=" * 50)
        
        success = True
        
        # 1. 设置测试用户
        if not self.setup_test_user():
            success = False
        
        # 2. 认证用户
        if success and not self.authenticate_user():
            success = False
        
        # 3. 测试Token记录功能
        if success and not self.test_token_recording():
            success = False
        
        # 4. 测试数据库统计功能
        if success and not self.test_database_stats():
            success = False
        
        # 5. 测试API端点
        if success and not self.test_api_endpoints():
            success = False
        
        # 6. 测试错误处理
        if success and not self.test_error_handling():
            success = False
        
        # 7. 生成测试报告
        if success:
            self.generate_report()
        
        print("\n" + "=" * 50)
        if success:
            print("🎉 所有测试完成！Token统计功能正常工作。")
        else:
            print("❌ 部分测试失败，请检查相关功能。")
        
        return success


def main():
    """主函数"""
    print("ScholarAgent Token统计功能测试脚本")
    print("=" * 50)
    
    # 检查Django服务器是否运行
    try:
        response = requests.get('http://localhost:8000/api/health/', timeout=5)
        if response.status_code != 200:
            print("❌ Django服务器未正常运行，请先启动: python manage.py runserver")
            return
    except Exception:
        print("❌ 无法连接到Django服务器，请先启动: python manage.py runserver")
        return
    
    # 运行测试
    tester = TokenStatsTester()
    tester.run_all_tests()


if __name__ == '__main__':
    main()