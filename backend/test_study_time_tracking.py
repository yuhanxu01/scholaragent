#!/usr/bin/env python3
"""
测试学习时间统计功能
验证学习会话与用户学习时间统计的自动同步
"""
import os
import sys
import django
import requests
import json
import time
from datetime import datetime

# 设置Django环境
sys.path.append('/Users/renqing/Downloads/scholaragent/backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')
django.setup()

from django.contrib.auth import get_user_model
from apps.knowledge.models import StudySession
from apps.users.models import UserProfile

User = get_user_model()


def test_study_time_tracking():
    """测试学习时间跟踪功能"""
    print("🧪 开始测试学习时间统计功能...")
    
    # 获取测试用户
    try:
        user = User.objects.get(username='testuser')
        print(f"✅ 找到测试用户: {user.username}")
    except User.DoesNotExist:
        print("❌ 测试用户不存在，创建测试用户...")
        user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
    
    # 记录初始学习时间
    initial_hours = user.profile.study_time_hours
    print(f"📊 初始学习时间: {initial_hours:.2f} 小时")
    
    # 创建学习会话
    print("\n🚀 创建学习会话...")
    session = StudySession.objects.create(
        user=user,
        start_time=datetime.now(),
        session_type='review'
    )
    print(f"✅ 学习会话创建成功: {session.id}")
    
    # 模拟学习过程（等待2秒）
    print("⏱️  模拟学习过程（2秒）...")
    time.sleep(2)
    
    # 结束学习会话
    print("🏁 结束学习会话...")
    session.end_time = datetime.now()
    session.duration = 2 * 60  # 2分钟 = 120秒
    session.cards_studied = 5
    session.correct_answers = 4
    session.save()
    
    print(f"✅ 学习会话结束，会话时长: {session.duration}秒")
    
    # 刷新用户档案数据
    user.refresh_from_db()
    updated_hours = user.profile.study_time_hours
    
    print(f"\n📈 学习时间更新:")
    print(f"   之前: {initial_hours:.2f} 小时")
    print(f"   现在: {updated_hours:.2f} 小时")
    print(f"   增长: {updated_hours - initial_hours:.4f} 小时")
    
    # 验证数据一致性
    expected_hours = initial_hours + (session.duration / 3600.0)
    
    if abs(updated_hours - expected_hours) < 0.001:
        print("✅ 学习时间同步成功！")
        print(f"   预期: {expected_hours:.4f} 小时")
        print(f"   实际: {updated_hours:.4f} 小时")
    else:
        print("❌ 学习时间同步失败！")
        print(f"   预期: {expected_hours:.4f} 小时")
        print(f"   实际: {updated_hours:.4f} 小时")
        print(f"   差异: {abs(updated_hours - expected_hours):.4f} 小时")
    
    # 测试API端点
    print("\n🌐 测试API端点...")
    try:
        # 使用Django shell直接测试API逻辑
        from apps.users.views import get_user_stats
        from django.test import RequestFactory
        
        factory = RequestFactory()
        request = factory.get('/auth/stats/')
        request.user = user
        
        response = get_user_stats(request)
        stats_data = json.loads(response.content)
        
        print(f"✅ API响应数据:")
        for key, value in stats_data.items():
            print(f"   {key}: {value}")
        
        # 验证API返回的学习时间
        api_study_hours = stats_data.get('study_time_hours', 0)
        if abs(api_study_hours - updated_hours) < 0.001:
            print("✅ API返回的学习时间数据正确！")
        else:
            print("❌ API返回的学习时间数据不正确！")
            print(f"   数据库: {updated_hours:.4f} 小时")
            print(f"   API: {api_study_hours:.4f} 小时")
            
    except Exception as e:
        print(f"❌ API测试失败: {str(e)}")
    
    # 清理测试数据
    print("\n🧹 清理测试数据...")
    session.delete()
    user.profile.study_time_hours = initial_hours  # 恢复初始值
    user.profile.save()
    print("✅ 测试数据清理完成")
    
    print("\n🎉 测试完成！")


def test_multiple_sessions():
    """测试多个学习会话的累计效果"""
    print("\n🔄 测试多个学习会话的累计效果...")
    
    try:
        user = User.objects.get(username='testuser')
    except User.DoesNotExist:
        print("❌ 测试用户不存在")
        return
    
    initial_hours = user.profile.study_time_hours
    print(f"📊 初始学习时间: {initial_hours:.2f} 小时")
    
    # 创建3个学习会话
    sessions = []
    for i in range(3):
        session = StudySession.objects.create(
            user=user,
            start_time=datetime.now(),
            session_type='review'
        )
        
        # 模拟不同长度的学习
        duration = (i + 1) * 60  # 1分钟, 2分钟, 3分钟
        session.end_time = datetime.now()
        session.duration = duration
        session.cards_studied = (i + 1) * 5
        session.correct_answers = (i + 1) * 4
        session.save()
        
        sessions.append(session)
        print(f"✅ 会话 {i+1}: {duration}秒")
    
    # 刷新用户数据
    user.refresh_from_db()
    final_hours = user.profile.study_time_hours
    
    # 计算预期总时间
    total_duration = sum(s.duration for s in sessions)
    expected_hours = initial_hours + (total_duration / 3600.0)
    
    print(f"\n📈 多会话累计结果:")
    print(f"   总学习时长: {total_duration}秒 = {total_duration/60:.1f}分钟")
    print(f"   之前: {initial_hours:.4f} 小时")
    print(f"   现在: {final_hours:.4f} 小时")
    print(f"   增长: {final_hours - initial_hours:.4f} 小时")
    print(f"   预期增长: {total_duration/3600:.4f} 小时")
    
    if abs(final_hours - expected_hours) < 0.001:
        print("✅ 多会话累计计算正确！")
    else:
        print("❌ 多会话累计计算错误！")
    
    # 清理
    for session in sessions:
        session.delete()
    user.profile.study_time_hours = initial_hours
    user.profile.save()
    print("✅ 多会话测试清理完成")


if __name__ == "__main__":
    test_study_time_tracking()
    test_multiple_sessions()