#!/usr/bin/env python
import os
import sys
import django
import random

# 添加项目路径
sys.path.insert(0, '/Users/renqing/Downloads/scholaragent/backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')
django.setup()

from django.contrib.auth import get_user_model
from apps.documents.models import Document
from apps.knowledge.models import Note
from apps.users.models import Comment
from django.contrib.contenttypes.models import ContentType

User = get_user_model()

# 测试评论内容
COMMENT_TEMPLATES = [
    "这个内容真的很有帮助！感谢分享。",
    "学习了，这个方法解决了我的问题。",
    "非常清晰易懂，讲解得很透彻。",
    "希望能看到更多类似的内容。",
    "这个概念之前一直没理解，现在明白了。",
    "实践出真知，说的很有道理。",
    "这个角度很独特，值得深入思考。",
    "总结得很好，关键点都提到了。",
    "期待后续的内容！",
    "有启发，谢谢作者的分享。",
    "理论结合实际，非常实用。",
    "循序渐进的讲解方式很棒。",
    "案例很有代表性，容易理解。",
    "解决了我的困惑，非常感谢。",
    "逻辑清晰，结构合理。",
]

# 回复内容
REPLY_TEMPLATES = [
    "你说得对，我也这么认为。",
    "很好的补充，谢谢你的观点。",
    "确实如此，这个细节很重要。",
    "有道理，我之前没考虑到这一点。",
    "赞同！这确实是个关键问题。",
    "谢谢提醒，我会注意这点的。",
    "你的理解很深入，学习了。",
    "这个例子很贴切，帮助很大。",
    "说得好，这个问题值得讨论。",
    "有启发，让我想到更多。",
]

print("正在创建测试评论数据...")
print("=" * 60)

# 获取测试用户
users = User.objects.all()
if len(users) < 2:
    print("错误：需要至少2个用户来创建评论和回复")
    sys.exit(1)

# 获取文档和笔记
documents = Document.objects.filter(status='ready', privacy='public')
notes = Note.objects.filter(is_public=True)

if not documents and not notes:
    print("错误：没有找到可评论的文档或笔记")
    sys.exit(1)

# 创建文档评论
doc_content_type = ContentType.objects.get_for_model(Document)
for doc in documents:
    print(f"\n处理文档: {doc.title[:50]}...")

    # 每个文档添加3-8条评论
    comment_count = random.randint(3, 8)
    for i in range(comment_count):
        user = random.choice(users)
        content = random.choice(COMMENT_TEMPLATES)

        # 创建顶级评论
        comment = Comment.objects.create(
            user=user,
            content_type=doc_content_type,
            object_id=doc.id,
            content=content
        )

        print(f"  - 评论 {i+1}: {content[:30]}... (by {user.username})")

        # 随机添加回复
        if random.random() < 0.6:  # 60%的概率有回复
            reply_count = random.randint(1, 3)
            for j in range(reply_count):
                reply_user = random.choice([u for u in users if u != user])
                reply_content = random.choice(REPLY_TEMPLATES)

                reply = Comment.objects.create(
                    user=reply_user,
                    content_type=doc_content_type,
                    object_id=doc.id,
                    content=reply_content,
                    parent=comment
                )

                # 更新回复计数
                comment.replies_count += 1
                comment.save()

                print(f"    - 回复: {reply_content[:30]}... (by {reply_user.username})")

# 创建笔记评论
note_content_type = ContentType.objects.get_for_model(Note)
for note in notes:
    print(f"\n处理笔记: {note.title[:50]}...")

    # 每个笔记添加2-5条评论
    comment_count = random.randint(2, 5)
    for i in range(comment_count):
        user = random.choice(users)
        content = random.choice(COMMENT_TEMPLATES)

        # 创建顶级评论
        comment = Comment.objects.create(
            user=user,
            content_type=note_content_type,
            object_id=note.id,
            content=content
        )

        print(f"  - 评论 {i+1}: {content[:30]}... (by {user.username})")

        # 随机添加回复
        if random.random() < 0.4:  # 40%的概率有回复
            reply_count = random.randint(1, 2)
            for j in range(reply_count):
                reply_user = random.choice([u for u in users if u != user])
                reply_content = random.choice(REPLY_TEMPLATES)

                reply = Comment.objects.create(
                    user=reply_user,
                    content_type=note_content_type,
                    object_id=note.id,
                    content=reply_content,
                    parent=comment
                )

                # 更新回复计数
                comment.replies_count += 1
                comment.save()

                print(f"    - 回复: {reply_content[:30]}... (by {reply_user.username})")

print("\n" + "=" * 60)
print("✅ 测试评论数据创建完成！")

# 统计评论数据
doc_comments = Comment.objects.filter(content_type=doc_content_type).count()
note_comments = Comment.objects.filter(content_type=note_content_type).count()
total_comments = doc_comments + note_comments

print(f"\n📊 评论统计：")
print(f"  - 文档评论总数: {doc_comments}")
print(f"  - 笔记评论总数: {note_comments}")
print(f"  - 评论总数: {total_comments}")
print(f"  - 参与评论用户: {Comment.objects.values('user').distinct().count()}")

print("\n现在可以在前端测试评论功能了！")