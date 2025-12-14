#!/usr/bin/env python
import os
import sys
import django

# Setup Django
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), 'backend'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.study.models import Vocabulary
from django.contrib.auth.models import User

# 查询所有用户的词汇
print("所有用户的词汇：")
for user in User.objects.all():
    print(f"\n用户: {user.username} (ID: {user.id})")
    vocab = Vocabulary.objects.filter(user=user)
    for v in vocab:
        print(f"  - {v.word}: {v.definition[:50] if v.definition else '(无释义)'}")