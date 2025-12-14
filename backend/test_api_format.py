#!/usr/bin/env python
import os
import sys
import django

# 添加项目路径
sys.path.insert(0, '/Users/renqing/Downloads/scholaragent/backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')
django.setup()

from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import get_user_model
import json

User = get_user_model()

def test_api_response_format():
    """测试API响应格式是否与前端期望的一致"""
    print("=" * 60)
    print("测试API响应格式")
    print("=" * 60)

    # 创建测试客户端
    client = APIClient()
    client.defaults['HTTP_HOST'] = 'localhost'

    # 获取测试用户
    try:
        user = User.objects.get(username='alice_wang')
        print(f"✅ 找到测试用户: {user.display_name}")
    except User.DoesNotExist:
        print("❌ 找不到测试用户 alice_wang")
        return

    # 生成JWT token
    refresh = RefreshToken.for_user(user)
    access_token = str(refresh.access_token)

    # 设置认证头
    client.credentials(HTTP_AUTHORIZATION=f'Bearer {access_token}')

    # 测试获取收藏笔记
    print("\n📚 测试获取收藏笔记 API...")
    response = client.get('/api/knowledge/notes/bookmarks/')

    print(f"状态码: {response.status_code}")

    if response.status_code == 200:
        data = response.json()
        print(f"\n📊 响应结构分析:")
        print(f"  - 响应类型: {type(data)}")
        print(f"  - 顶层键: {list(data.keys()) if isinstance(data, dict) else 'Not a dict'}")

        # 模拟前端处理逻辑
        print(f"\n🔍 模拟前端处理逻辑:")
        print(f"  response.data = {json.dumps(data, indent=2, ensure_ascii=False)[:200]}...")

        # 模拟 NoteList 组件中的处理
        responseData = data  # response.data
        notesData = responseData.get('data', responseData)  # responseData.data || responseData
        notes = notesData.get('results', [])  # notesData.results || []
        totalCount = notesData.get('count', len(notes))  # notesData.count || notes.length

        print(f"\n📝 处理结果:")
        print(f"  - responseData.data: {responseData.get('data', 'undefined')}")
        print(f"  - notesData (fallback to responseData): {type(notesData)}")
        print(f"  - notes: {len(notes)} 条")
        print(f"  - totalCount: {totalCount}")

        # 显示第一条笔记
        if notes:
            print(f"\n📄 第一条笔记示例:")
            first_note = notes[0]
            print(f"  - ID: {first_note.get('id')}")
            print(f"  - 标题: {first_note.get('title')}")
            print(f"  - 收藏状态: {first_note.get('is_bookmarked')}")
            print(f"  - 公开状态: {first_note.get('is_public')}")

    else:
        print(f"❌ API调用失败: {response.content.decode()}")

if __name__ == '__main__':
    test_api_response_format()