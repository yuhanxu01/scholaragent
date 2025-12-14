#!/usr/bin/env python3

import os
import sys
import django

# 设置Django环境
sys.path.append('/Users/renqing/Downloads/scholaragent/backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')

django.setup()

from apps.users.models import CustomUser
from apps.study.models import Vocabulary

# 检查用户和词汇模型
print("Users:", CustomUser.objects.count())
print("Vocabulary records:", Vocabulary.objects.count())

# 尝试创建一个测试词汇
try:
    user = CustomUser.objects.first()
    if user:
        print(f"Found user: {user.username}")

        # 测试创建词汇
        vocab_data = {
            'word': 'test',
            'definition': 'a test word',
            'translation': '测试',
            'user': user
        }

        vocab = Vocabulary.objects.create(**vocab_data)
        print(f"Successfully created vocabulary: {vocab.word}")
        print(f"Vocabulary ID: {vocab.id}")

    else:
        print("No users found in database")

except Exception as e:
    print(f"Error: {e}")
    import traceback
    traceback.print_exc()