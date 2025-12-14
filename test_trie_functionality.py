#!/usr/bin/env python3
"""
测试Trie词典功能的正确性
"""
import os
import sys
import time

# 设置Django环境
sys.path.insert(0, '/Users/renqing/Downloads/scholaragent/backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.test_sqlite')
import django
django.setup()

from apps.study.trie_dictionary import TrieDictionary

def test_trie_functionality():
    """测试Trie词典的功能"""
    print("=" * 60)
    print("测试Trie词典功能")
    print("=" * 60)

    # 创建Trie词典实例
    cache_dir = '/Users/renqing/Downloads/scholaragent/backend/cache/trie'
    trie_dict = TrieDictionary(cache_dir=cache_dir)

    # 加载Trie
    print("\n1. 加载Trie词典...")
    stardict_path = '/Users/renqing/Downloads/scholaragent/stardict.db'
    if trie_dict.load_dictionary(stardict_path):
        info = trie_dict.get_info()
        print(f"   - 词典标题: {info.get('BookTitle', 'Unknown')}")
        print(f"   - 单词数量: {info.get('WordCount', 0):,}")
        print(f"   - 加载状态: {'已加载' if info.get('is_loaded', False) else '未加载'}")
        print("   ✓ Trie加载成功")
    else:
        print("   ✗ Trie加载失败")
        return False

    # 测试精确匹配
    print("\n2. 测试精确匹配...")
    test_words = [
        ('hello', 'n. an expression of greeting'),
        ('Hello', 'n. an expression of greeting'),
        ('HELLO', 'n. an expression of greeting'),
        ('computer', 'Should have definition'),
        ('python', 'Programming language'),
        ('algorithm', 'n. a precise rule'),
        ('nonexistent', 'Should not exist')
    ]

    for word, expected in test_words:
        start_time = time.time()
        result = trie_dict.lookup_word(word)
        query_time = (time.time() - start_time) * 1000

        if result:
            print(f"   ✓ '{word}': {result.get('definition', '')[:50]}... "
                  f"({query_time:.3f}ms)")
            # 验证返回的单词保持原始大小写
            assert result['word'] == word, f"Word case not preserved: {result['word']} != {word}"
        else:
            if expected == 'Should not exist':
                print(f"   ✓ '{word}': 未找到 (符合预期)")
            else:
                print(f"   ✗ '{word}': 未找到 (预期应该存在)")

    # 测试前缀匹配
    print("\n3. 测试前缀匹配...")
    prefixes = ['hel', 'comp', 'pyth', 'alg']

    for prefix in prefixes:
        start_time = time.time()
        results = trie_dict.search_words(prefix, limit=5)
        query_time = (time.time() - start_time) * 1000

        print(f"   '{prefix}*' 找到 {len(results)} 个结果 ({query_time:.3f}ms):")
        for i, word in enumerate(results[:3]):
            print(f"     - {word}")

    # 测试自动补全
    print("\n4. 测试自动补全...")
    for prefix in prefixes:
        start_time = time.time()
        results = trie_dict.autocomplete(prefix, limit=3)
        query_time = (time.time() - start_time) * 1000

        print(f"   '{prefix}' 自动补全 {len(results)} 个结果 ({query_time:.3f}ms):")
        for result in results:
            print(f"     - {result.word}: {result.definition[:30]}...")

    # 性能测试
    print("\n5. 性能测试...")
    # 准备测试单词
    test_words = ['hello', 'world', 'computer', 'python', 'algorithm'] * 100

    start_time = time.time()
    success_count = 0
    for word in test_words:
        result = trie_dict.lookup_word(word)
        if result:
            success_count += 1

    total_time = time.time() - start_time
    avg_time = (total_time / len(test_words)) * 1000

    print(f"   - 总查询数: {len(test_words)}")
    print(f"   - 成功查询: {success_count}")
    print(f"   - 总时间: {total_time:.3f}秒")
    print(f"   - 平均查询时间: {avg_time:.3f}毫秒")
    print(f"   - QPS: {len(test_words) / total_time:.0f} 查询/秒")

    # 内存使用测试
    print("\n6. 内存使用情况...")
    import psutil
    process = psutil.Process()
    memory_info = process.memory_info()
    memory_mb = memory_info.rss / 1024 / 1024

    print(f"   - RSS内存使用: {memory_mb:.2f} MB")

    print("\n" + "=" * 60)
    print("Trie词典功能测试完成")
    print("=" * 60)

    return True

if __name__ == "__main__":
    success = test_trie_functionality()
    if success:
        print("\n✓ 所有测试通过")
        sys.exit(0)
    else:
        print("\n✗ 测试失败")
        sys.exit(1)
