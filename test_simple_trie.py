#!/usr/bin/env python3
"""
简单的Trie测试
"""
import os
import sys

# 设置Django环境
sys.path.insert(0, '/Users/renqing/Downloads/scholaragent/backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')
import django
django.setup()

from apps.study.trie_dictionary import CompactTrie, WordData, CaseInsensitiveTrie

def test_compact_trie():
    """测试CompactTrie实现"""
    print("测试CompactTrie...")

    trie = CompactTrie()

    # 插入一些测试词
    test_words = [
        ('hello', 'greeting'),
        ('help', 'assistance'),
        ('world', 'earth'),
    ]

    for word, definition in test_words:
        word_data = WordData()
        word_data.word = word
        word_data.definition = definition
        word_id = trie.insert(word, word_data)
        print(f"  Inserted '{word}' with ID {word_id}")

    # 测试查询
    for word, _ in test_words:
        result = trie.exact_match(word)
        if result:
            print(f"  ✓ Found '{word}': {result.definition}")
        else:
            print(f"  ✗ Not found '{word}'")

    # 测试大小写
    result = trie.exact_match('HELLO')
    if result:
        print(f"  ✓ Found 'HELLO' (case insensitive): {result.definition}")
    else:
        print(f"  ✗ Not found 'HELLO'")

    print(f"\nTotal words in Trie: {trie.word_count}")

if __name__ == "__main__":
    test_compact_trie()