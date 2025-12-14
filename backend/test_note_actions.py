#!/usr/bin/env python
import os
import sys
import django

# 添加项目路径
sys.path.insert(0, '/Users/renqing/Downloads/scholaragent/backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')
django.setup()

from apps.knowledge.models import Note

# 查看前5个笔记的状态
print("📝 笔记收藏状态：")
for note in Note.objects.all()[:5]:
    print(f"  • {note.title[:30]}...")
    print(f"    - 收藏状态: {'已收藏' if note.is_bookmarked else '未收藏'}")
    print(f"    - 公开状态: {'公开' if note.is_public else '私有'}")
    print(f"    - 掌握状态: {'已掌握' if note.is_mastered else '未掌握'}")

print("\n✅ 笔记测试完成！")