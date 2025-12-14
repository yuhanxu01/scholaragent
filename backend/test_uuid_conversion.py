#!/usr/bin/env python
"""
测试UUID转换问题
"""

import os
import sys
import django
from uuid import UUID

# 添加项目路径
sys.path.insert(0, '/Users/renqing/Downloads/scholaragent/backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')
django.setup()

from django.contrib.auth import get_user_model
from apps.knowledge.models import Note

User = get_user_model()

def test_uuid_conversion():
    print("=" * 70)
    print("测试UUID转换")
    print("=" * 70)

    # 获取Alice的第一条笔记
    note = Note.objects.filter(user__username='alice_wang').first()
    if not note:
        print("❌ 没有找到笔记")
        return

    print(f"笔记ID (UUID对象): {note.id}")
    print(f"类型: {type(note.id)}")

    # 转换为字符串
    note_id_str = str(note.id)
    print(f"\n笔记ID (字符串): {note_id_str}")
    print(f"类型: {type(note_id_str)}")

    # 测试前端如何传递ID
    print("\n前端可能的传递方式:")
    print(f"1. 直接传递: {note.id}")
    print(f"2. 字符串转换: {str(note.id)}")
    print(f"3. JSON序列化: {json.dumps(str(note.id))}")

    # 测试URL路径
    from django.urls import reverse
    try:
        url = reverse('knowledge:note-detail', kwargs={'pk': note.id})
        print(f"\nDjango reverse URL: {url}")
    except:
        print("\n无法通过reverse生成URL")

if __name__ == '__main__':
    test_uuid_conversion()