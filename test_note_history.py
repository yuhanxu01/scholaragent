#!/usr/bin/env python
"""
测试笔记历史记录功能
"""
import os
import sys
import django

# 设置Django环境
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.config.settings.base')
sys.path.append('backend')
django.setup()

from django.contrib.auth import get_user_model
from apps.knowledge.models import Note, NoteHistory

def test_note_history():
    """测试笔记历史记录功能"""
    print("开始测试笔记历史记录功能...")

    # 获取或创建测试用户
    User = get_user_model()
    user, created = User.objects.get_or_create(
        email='test@example.com',
        defaults={
            'username': 'testuser',
            'first_name': 'Test',
            'last_name': 'User'
        }
    )
    print(f"用户: {user.email} (创建: {created})")

    # 删除之前的测试笔记
    Note.objects.filter(user=user, title__in=['原始标题', '修改后的标题']).delete()

    # 创建测试笔记（通过save()方法，这样会创建历史记录）
    note = Note(
        user=user,
        title='原始标题',
        content='原始内容',
        tags=['测试', '历史记录']
    )
    note.save()  # 这会触发历史记录创建
    print(f"创建笔记: {note.title}")

    # 检查历史记录
    history_count = NoteHistory.objects.filter(note=note).count()
    print(f"创建后的历史记录数量: {history_count}")

    # 编辑笔记
    note.title = '修改后的标题'
    note.content = '修改后的内容'
    note.tags = ['测试', '历史记录', '修改']
    note.save()
    print("编辑笔记")

    # 再次检查历史记录
    history_count = NoteHistory.objects.filter(note=note).count()
    print(f"编辑后的历史记录数量: {history_count}")

    # 获取所有历史记录
    history_records = NoteHistory.objects.filter(note=note).order_by('-edited_at')
    print("\n历史记录:")
    for i, record in enumerate(history_records, 1):
        print(f"{i}. {record.get_change_type_display()} - {record.change_summary}")
        print(f"   标题: {record.title}")
        print(f"   内容: {record.content[:50]}...")
        print(f"   标签: {record.tags}")
        print(f"   时间: {record.edited_at}")
        print()

    # 测试历史记录的变更比较
    if len(history_records) >= 2:
        print("测试变更比较:")
        current = history_records[0]
        previous = history_records[1]
        changes = current.get_changes(previous)
        print(f"变更: {changes}")

    print("测试完成!")

if __name__ == '__main__':
    test_note_history()
