#!/usr/bin/env python
import os
import sys
import django

# Setup Django
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.study.models import Vocabulary
from apps.study.vocabulary_views import get_dictionary_instance

def update_empty_definitions():
    """更新所有没有释义的单词"""
    dictionary = get_dictionary_instance()

    if not dictionary:
        print("无法加载词典")
        return

    # 查找所有没有释义或释义为空的单词
    vocabularies = Vocabulary.objects.filter(
        models.Q(definition='') |
        models.Q(definition__isnull=True)
    )

    print(f"找到 {vocabularies.count()} 个需要更新的单词")

    for vocab in vocabularies:
        print(f"\n正在处理单词: {vocab.word}")

        # 从词典查找
        result = dictionary.lookup_word(vocab.word)

        if result:
            # 更新单词信息
            vocab.pronunciation = result.get('pronunciation', '')
            vocab.definition = result.get('definition', '')
            vocab.translation = result.get('translation', '')

            # 如果有例句，使用第一个
            examples = result.get('examples', [])
            if examples:
                vocab.example_sentence = examples[0]

            vocab.save()

            print(f"  ✓ 已更新:")
            print(f"    - 音标: {vocab.pronunciation}")
            print(f"    - 释义: {vocab.definition[:50]}...")
            print(f"    - 翻译: {vocab.translation}")
        else:
            print(f"  ✗ 词典中未找到该单词")

if __name__ == '__main__':
    from django.db import models
    update_empty_definitions()