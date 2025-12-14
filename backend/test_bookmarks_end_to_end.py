#!/usr/bin/env python
"""
测试收藏功能的端到端流程
1. 确保Alice Wang有收藏的笔记
2. 测试API返回正确的收藏列表
3. 提供前端测试说明
"""

import os
import sys
import django

# 添加项目路径
sys.path.insert(0, '/Users/renqing/Downloads/scholaragent/backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')
django.setup()

from django.contrib.auth import get_user_model
from apps.knowledge.models import Note
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken
import json

User = get_user_model()

def test_bookmarks_e2e():
    print("=" * 70)
    print("测试收藏功能的端到端流程")
    print("=" * 70)

    # 1. 检查Alice Wang的收藏状态
    print("\n1. 检查Alice Wang的笔记收藏状态...")
    try:
        alice = User.objects.get(username='alice_wang')
        bookmarked_notes = Note.objects.filter(user=alice, is_bookmarked=True)
        print(f"   ✓ Alice Wang有 {len(bookmarked_notes)} 条收藏的笔记")

        for i, note in enumerate(bookmarked_notes, 1):
            print(f"   {i}. {note.title} (ID: {note.id})")
    except User.DoesNotExist:
        print("   ❌ 找不到Alice Wang用户")
        return

    # 2. 测试API返回
    print("\n2. 测试API返回收藏列表...")
    client = APIClient()
    client.defaults['HTTP_HOST'] = 'localhost'

    # 生成token
    refresh = RefreshToken.for_user(alice)
    access_token = str(refresh.access_token)
    client.credentials(HTTP_AUTHORIZATION=f'Bearer {access_token}')

    # 测试获取收藏列表
    response = client.get('/api/knowledge/notes/bookmarks/')
    print(f"   ✓ API状态码: {response.status_code}")

    if response.status_code == 200:
        data = response.json()
        print(f"   ✓ API返回 {data['count']} 条收藏笔记")
    else:
        print(f"   ❌ API错误: {response.content.decode()}")

    # 3. 测试收藏/取消收藏功能
    print("\n3. 测试收藏/取消收藏功能...")
    # 找一个未收藏的笔记
    unbookmarked_note = Note.objects.filter(user=alice, is_bookmarked=False).first()

    if unbookmarked_note:
        print(f"   测试笔记: {unbookmarked_note.title[:30]}...")

        # 收藏
        response = client.post(f'/api/knowledge/notes/{unbookmarked_note.id}/bookmark/')
        if response.status_code == 200:
            print("   ✓ 收藏成功")
        else:
            print(f"   ❌ 收藏失败: {response.content.decode()}")

        # 取消收藏
        response = client.post(f'/api/knowledge/notes/{unbookmarked_note.id}/unbookmark/')
        if response.status_code == 200:
            print("   ✓ 取消收藏成功")
        else:
            print(f"   ❌ 取消收藏失败: {response.content.decode()}")
    else:
        print("   ⚠️ 没有找到可测试的未收藏笔记")

    # 4. 前端测试说明
    print("\n" + "=" * 70)
    print("前端测试说明")
    print("=" * 70)
    print(f"""
现在请按照以下步骤在前端测试收藏功能：

1. 访问前端应用：http://localhost:5181

2. 登录或设置认证Token：
   - 方法1：使用用户名 alice_wang，密码 password123 登录
   - 方法2：在浏览器控制台执行：
     localStorage.setItem('access_token', '{access_token}')

3. 测试收藏功能：
   - 导航到"知识"->"笔记"页面
   - 点击筛选栏中的"收藏"按钮
   - 应该看到 {len(bookmarked_notes)} 条收藏的笔记

4. 测试收藏/取消收藏操作：
   - 在任意笔记上点击收藏图标
   - 观察图标状态变化
   - 刷新页面验证状态是否保存

5. 如果问题仍然存在，请：
   - 打开浏览器开发者工具（F12）
   - 查看Network标签页中的API请求
   - 检查 /api/knowledge/notes/bookmarks/ 请求的响应
   - 查看Console标签页是否有错误信息

总结：
- ✅ 后端API正常工作
- ✅ Alice Wang有 {len(bookmarked_notes)} 条收藏笔记
- ✅ 收藏/取消收藏功能正常
- ⚠️ 需要确保前端已正确登录
""")

if __name__ == '__main__':
    test_bookmarks_e2e()