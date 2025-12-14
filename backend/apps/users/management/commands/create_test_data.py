from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.utils import timezone
from apps.documents.models import Document
from apps.knowledge.models import Note
from apps.users.models import Follow, Like, DocumentCollection
from django.contrib.contenttypes.models import ContentType
import uuid
import random

User = get_user_model()

class Command(BaseCommand):
    help = '创建测试用户和社交数据'

    def handle(self, *args, **options):
        self.stdout.write('开始创建测试数据...')

        # 1. 创建测试用户
        test_users = self.create_test_users()
        self.stdout.write(f'创建了 {len(test_users)} 个测试用户')

        # 2. 为每个用户创建公开文档
        documents = self.create_documents(test_users)
        self.stdout.write(f'创建了 {len(documents)} 个公开文档')

        # 3. 为每个用户创建笔记
        notes = self.create_notes(test_users, documents)
        self.stdout.write(f'创建了 {len(notes)} 个公开笔记')

        # 4. 创建用户之间的关注关系
        follows = self.create_follows(test_users)
        self.stdout.write(f'创建了 {len(follows)} 个关注关系')

        # 5. 创建点赞和收藏
        likes = self.create_likes_and_collections(test_users, documents, notes)
        self.stdout.write(f'创建了 {len(likes)} 个点赞和收藏')

        self.stdout.write(self.style.SUCCESS('测试数据创建完成！'))

    def create_test_users(self):
        """创建5个测试用户"""
        users_data = [
            {
                'username': 'alice_wang',
                'email': 'alice@example.com',
                'first_name': 'Alice',
                'last_name': 'Wang',
                'bio': '数学博士生，专注于机器学习和深度学习理论研究',
                'location': '北京',
                'website': 'https://alice-wang.example.com',
                'github_username': 'alice-wang',
                'is_verified': True,
                'is_featured': True
            },
            {
                'username': 'bob_chen',
                'email': 'bob@example.com',
                'first_name': 'Bob',
                'last_name': 'Chen',
                'bio': '物理学家，研究量子计算和量子信息理论',
                'location': '上海',
                'website': 'https://bob-chen.example.com',
                'github_username': 'bob-chen',
                'is_verified': False,
                'is_featured': False
            },
            {
                'username': 'carol_liu',
                'email': 'carol@example.com',
                'first_name': 'Carol',
                'last_name': 'Liu',
                'bio': '计算机科学硕士，AI研究员，专注于自然语言处理',
                'location': '深圳',
                'website': 'https://carol-liu.example.com',
                'github_username': 'carol-liu',
                'is_verified': True,
                'is_featured': False
            },
            {
                'username': 'david_zhang',
                'email': 'david@example.com',
                'first_name': 'David',
                'last_name': 'Zhang',
                'bio': '数据科学家，热爱统计学和数据可视化',
                'location': '杭州',
                'website': 'https://david-zhang.example.com',
                'github_username': 'david-zhang',
                'is_verified': False,
                'is_featured': True
            },
            {
                'username': 'eva_zhou',
                'email': 'eva@example.com',
                'first_name': 'Eva',
                'last_name': 'Zhou',
                'bio': '生物信息学研究员，专注于基因组数据分析',
                'location': '广州',
                'website': 'https://eva-zhou.example.com',
                'github_username': 'eva-zhou',
                'is_verified': True,
                'is_featured': False
            }
        ]

        users = []
        for user_data in users_data:
            user, created = User.objects.get_or_create(
                username=user_data['username'],
                defaults={
                    'email': user_data['email'],
                    'first_name': user_data['first_name'],
                    'last_name': user_data['last_name'],
                    'bio': user_data['bio'],
                    'location': user_data['location'],
                    'website': user_data['website'],
                    'github_username': user_data['github_username'],
                    'is_verified': user_data['is_verified'],
                    'is_featured': user_data['is_featured'],
                }
            )
            if created:
                user.set_password('password123')
                user.save()
            users.append(user)

        return users

    def create_documents(self, users):
        """为每个用户创建3-5个公开文档"""
        documents_data = [
            {
                'title': '深度学习在自然语言处理中的应用',
                'content': '''# 深度学习在自然语言处理中的应用

## 概述
深度学习技术已经在自然语言处理（NLP）领域取得了革命性的进展。

## 主要模型
- Transformer架构
- BERT模型
- GPT系列模型

## 实际应用
- 机器翻译
- 文本摘要
- 情感分析

## 总结
深度学习为NLP带来了前所未有的能力。''',
                'tags': ['深度学习', 'NLP', 'Transformer', 'BERT']
            },
            {
                'title': '量子计算基础教程',
                'content': '''# 量子计算基础教程

## 量子比特
量子比特（qubit）是量子计算的基本单元。

## 量子门
- Hadamard门
- CNOT门
- 量子相位门

## 量子算法
- Shor算法
- Grover算法
- 量子傅里叶变换

## 应用前景
量子计算在密码学、药物发现等领域有巨大潜力。''',
                'tags': ['量子计算', '量子算法', '量子门', 'Shor算法']
            },
            {
                'title': '统计学基础：概率分布',
                'content': '''# 统计学基础：概率分布

## 概率分布类型
- 正态分布
- 二项分布
- 泊松分布

## 中心极限定理
中心极限定理是统计学的重要定理。

## 假设检验
- t检验
- 卡方检验
- F检验

## 实际应用
统计学在数据分析、机器学习中广泛应用。''',
                'tags': ['统计学', '概率分布', '假设检验', '数据分析']
            },
            {
                'title': '基因组数据分析方法',
                'content': '''# 基因组数据分析方法

## 数据预处理
- 序列比对
- 质量控制
- 变异检测

## 分析工具
- BLAST
- Bowtie
- SAMtools

## 功能注释
- GO分析
- KEGG通路分析
- 蛋白质功能预测

## 研究进展
基因组学正在改变我们对生命的理解。''',
                'tags': ['基因组学', '生物信息学', 'BLAST', 'KEGG']
            },
            {
                'title': '机器学习实战：分类算法',
                'content': '''# 机器学习实战：分类算法

## 决策树
决策树是一种直观的分类方法。

## 支持向量机
SVM在高维空间中表现优异。

## 随机森林
随机森林集成了多个决策树。

## 深度神经网络
深度学习在图像识别中表现出色。

## 模型评估
- 准确率
- 召回率
- F1分数''',
                'tags': ['机器学习', '分类算法', 'SVM', '随机森林']
            },
            {
                'title': '数据可视化最佳实践',
                'content': '''# 数据可视化最佳实践

## 选择合适的图表类型
- 柱状图：比较类别数据
- 折线图：显示趋势
- 散点图：展示关系

## 设计原则
- 简洁明了
- 色彩搭配合理
- 标签清晰

## 工具推荐
- Matplotlib
- Seaborn
- Plotly
- Tableau

## 案例
通过实例学习如何制作有效的可视化。''',
                'tags': ['数据可视化', 'Matplotlib', 'Seaborn', 'Tableau']
            },
            {
                'title': '神经网络架构设计',
                'content': '''# 神经网络架构设计

## 基础概念
- 神经元
- 激活函数
- 反向传播

## 常见架构
- CNN：卷积神经网络
- RNN：循环神经网络
- LSTM：长短期记忆网络

## 优化技巧
- 批量归一化
- Dropout
- 学习率调度

## 最新进展
Transformer架构改变了深度学习的游戏规则。''',
                'tags': ['神经网络', 'CNN', 'RNN', 'LSTM']
            },
            {
                'title': '时间序列分析方法',
                'content': '''# 时间序列分析方法

## 基础概念
- 趋势分析
- 季节性分解
- 周期性检测

## 预测模型
- ARIMA模型
- 指数平滑
- LSTM预测

## 实际应用
- 股票预测
- 销售预测
- 天气预报

## 工具使用
Python中的pandas和statslib是强大的时间序列分析工具。''',
                'tags': ['时间序列', 'ARIMA', '预测', 'pandas']
            }
        ]

        documents = []
        for i, user in enumerate(users):
            # 每个用户创建3-5个文档
            user_docs = random.sample(documents_data, random.randint(3, 5))
            for j, doc_data in enumerate(user_docs):
                doc = Document.objects.create(
                    user=user,
                    title=f"[{user.first_name}] {doc_data['title']}",
                    file_type='md',
                    status='ready',
                    privacy='public',
                    raw_content=doc_data['content'],
                    cleaned_content=doc_data['content'],
                    tags=doc_data['tags'],
                    word_count=len(doc_data['content'].split()),
                    description=f"一篇关于{doc_data['tags'][0]}的学习笔记"
                )
                documents.append(doc)

        return documents

    def create_notes(self, users, documents):
        """为每个用户创建5-8个笔记"""
        notes_data = [
            {
                'title': '学习笔记：深度学习入门',
                'content': '今天学习了深度学习的基本概念，包括神经网络、反向传播等。感觉收获很大，需要多练习才能更好地理解。',
                'note_type': 'summary',
                'tags': ['学习', '深度学习', '笔记']
            },
            {
                'title': '疑问：量子纠缠现象',
                'content': '量子纠缠到底是什么原理？两个粒子如何能够瞬时相互影响？这个问题我还需要深入研究。',
                'note_type': 'question',
                'tags': ['量子物理', '疑问', '研究']
            },
            {
                'title': '见解：统计学的重要性',
                'content': '统计学不仅仅是数学，更是一种思维方式。它教会我们如何从数据中发现模式，如何评估不确定性。',
                'note_type': 'insight',
                'tags': ['统计学', '思维', '见解']
            },
            {
                'title': '方法：高效的学习策略',
                'content': '1. 制定学习计划\n2. 主动回顾\n3. 定期复习\n4. 实践应用\n5. 教授他人\n这些方法让我学习效率提高了不少。',
                'note_type': 'method',
                'tags': ['学习方法', '效率', '技巧']
            },
            {
                'title': '示例：贝叶斯定理应用',
                'content': '贝叶斯定理在机器学习中有广泛应用，特别是在分类算法中。例如在垃圾邮件过滤中，根据单词出现的概率判断邮件类型。',
                'note_type': 'example',
                'tags': ['贝叶斯', '机器学习', '应用']
            },
            {
                'title': '编程技巧：Python数据分析',
                'content': 'pandas库真的很强大，特别是groupby和merge功能。配合matplotlib可以做很多数据分析工作。',
                'note_type': 'method',
                'tags': ['Python', 'pandas', '数据分析']
            },
            {
                'title': '研究心得：文献阅读技巧',
                'content': '阅读文献时，先看摘要和结论，决定是否值得深入阅读。做好笔记，记录关键思想和自己的见解。',
                'note_type': 'insight',
                'tags': ['研究', '文献', '技巧']
            },
            {
                'title': '总结：本周学习回顾',
                'content': '这周主要学习了量子计算基础，掌握了量子比特和量子门的基本概念。下周计划深入学习量子算法。',
                'note_type': 'summary',
                'tags': ['总结', '回顾', '计划']
            }
        ]

        notes = []
        for i, user in enumerate(users):
            # 每个用户创建5-8个笔记
            user_notes = random.sample(notes_data, random.randint(5, 8))
            for j, note_data in enumerate(user_notes):
                # 随机选择一个文档关联（50%概率）
                document = random.choice(documents) if random.random() > 0.5 else None

                note = Note.objects.create(
                    user=user,
                    title=f"{note_data['title']}",
                    content=note_data['content'],
                    note_type=note_data['note_type'],
                    tags=note_data['tags'],
                    is_public=random.choice([True, True, False]),  # 2/3概率公开
                    is_bookmarked=random.choice([True, False]),
                    is_mastered=random.random() > 0.8,  # 20%概率已掌握
                    document=document
                )
                notes.append(note)

        return notes

    def create_follows(self, users):
        """创建用户之间的关注关系"""
        follows = []

        # 确保每个用户至少关注2-3个其他用户
        for i, user in enumerate(users):
            # 获取其他用户
            other_users = [u for u in users if u.id != user.id]

            # 随机选择2-3个用户关注
            follow_count = random.randint(2, 3)
            users_to_follow = random.sample(other_users, min(follow_count, len(other_users)))

            for target_user in users_to_follow:
                # 检查是否已经关注
                if not Follow.objects.filter(follower=user, following=target_user).exists():
                    follow = Follow.objects.create(
                        follower=user,
                        following=target_user
                    )
                    follows.append(follow)

        return follows

    def create_likes_and_collections(self, users, documents, notes):
        """创建点赞和收藏"""
        interactions = []

        # 获取ContentType
        doc_type = ContentType.objects.get_for_model(Document)
        note_type = ContentType.objects.get_for_model(Note)

        # 为文档创建点赞
        for i, document in enumerate(documents):
            # 随机选择3-6个用户点赞
            likers = random.sample([u for u in users if u.id != document.user.id],
                                random.randint(3, min(6, len(users)-1)))

            for liker in likers:
                like = Like.objects.create(
                    user=liker,
                    content_type=doc_type,
                    object_id=document.id
                )
                interactions.append(like)

                # 更新文档点赞数
                document.likes_count += 1
            document.save(update_fields=['likes_count'])

        # 为笔记创建点赞
        for i, note in enumerate(notes):
            # 随机选择2-4个用户点赞
            likers = random.sample([u for u in users if u.id != note.user.id],
                                random.randint(2, min(4, len(users)-1)))

            for liker in likers:
                like = Like.objects.create(
                    user=liker,
                    content_type=note_type,
                    object_id=note.id
                )
                interactions.append(like)

                # Note模型没有likes_count字段，跳过更新

        # 创建文档收藏
        for i, document in enumerate(documents):
            # 随机选择3-5个用户收藏（不能是作者自己）
            collectors = random.sample([u for u in users if u.id != document.user.id],
                                     random.randint(3, min(5, len(users)-1)))

            for collector in collectors:
                # 避免重复收藏
                if not DocumentCollection.objects.filter(user=collector, document=document).exists():
                    collection = DocumentCollection.objects.create(
                        user=collector,
                        document=document,
                        collection_name=random.choice(['默认收藏夹', '重要文档', '学习资料', '参考资料']),
                        notes=random.choice(['', '这篇文档写得很好', '很有价值的内容', '值得反复阅读'])
                    )
                    interactions.append(collection)

                    # 更新文档收藏数
                    document.collections_count += 1
            document.save(update_fields=['collections_count'])

        return interactions