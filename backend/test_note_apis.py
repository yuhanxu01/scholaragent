#!/usr/bin/env python
import os
import sys
import django

# 添加项目路径
sys.path.insert(0, '/Users/renqing/Downloads/scholaragent/backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')
django.setup()

from django.test import TestCase, Client
from django.contrib.auth import get_user_model
from django.contrib.contenttypes.models import ContentType
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken
import json

User = get_user_model()

# 模拟API测试
class NoteAPITest:
    def __init__(self):
        self.client = APIClient()
        # 设置正确的默认域名
        self.client.defaults['HTTP_HOST'] = 'localhost'
        self.user = None
        self.token = None
        self.setup_auth()

    def setup_auth(self):
        # 获取测试用户
        try:
            self.user = User.objects.get(username='alice_wang')
        except User.DoesNotExist:
            print("错误：找不到测试用户 alice_wang")
            return

        # 生成JWT token
        refresh = RefreshToken.for_user(self.user)
        self.token = str(refresh.access_token)

        # 设置认证头
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.token}')

    def test_bookmarked_notes(self):
        print("\n📚️ 测试获取收藏笔记API")
        response = self.client.get('/api/knowledge/notes/bookmarks/')
        print(f"状态码: {response.status_code}")

        if response.status_code == 200:
            data = response.json()
            print(f"响应数据: {json.dumps(data, indent=2, ensure_ascii=False)}")
            return data.get('results', [])
        else:
            print(f"错误响应: {response.content.decode()}")
            return []

    def test_toggle_bookmark(self):
        print("\n📝 测试收藏/取消收藏功能")

        # 获取第一个测试笔记
        from apps.knowledge.models import Note
        note = Note.objects.filter(user=self.user, is_bookmarked=False).first()

        if not note:
            print("没有找到可以测试的笔记")
            return

        print(f"测试笔记: {note.title[:30]}...")
        print(f"当前收藏状态: {note.is_bookmarked}")

        # 收藏笔记
        response = self.client.post(f'/api/knowledge/notes/{note.id}/bookmark/')
        print(f"\n收藏操作 - 状态码: {response.status_code}")
        print(f"响应: {response.content.decode()}")

        # 重新检查笔记状态
        note.refresh_from_db()
        print(f"更新后的收藏状态: {note.is_bookmarked}")

        # 取消收藏
        response = self.client.post(f'/api/knowledge/notes/{note.id}/unbookmark/')
        print(f"\n取消收藏 - 状态码: {response.status_code}")
        print(f"响应: {response.content.decode()}")

        # 再次检查
        note.refresh_from_db()
        print(f"最终收藏状态: {note.is_bookmarked}")

    def test_all(self):
        print("=" * 50)
        print("测试笔记API功能")
        print("=" * 50)

        if not self.user:
            print("错误: 认证设置失败")
            return

        # 测试获取收藏列表
        bookmarked = self.test_bookmarked_notes()

        print(f"\n✅ 收藏的笔记总数: {len(bookmarked)}")

        # 测试收藏/取消收藏功能
        self.test_toggle_bookmark()

if __name__ == '__main__':
    tester = NoteAPITest()
    tester.test_all()