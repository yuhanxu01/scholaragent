#!/usr/bin/env python3
"""
完整的Trie实现测试
"""
import os
import sys
import time
import random

# 设置Django环境
sys.path.insert(0, '/Users/renqing/Downloads/scholaragent/backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')
import django
django.setup()

from apps.study.trie_dictionary import TrieDictionary
from apps.study.stardict_sqlite import StarDictSQLite
from apps.study.simple_dictionary import SimpleDictionary

def test_correctness():
    """测试功能正确性"""
    print("=" * 60)
    print("功能正确性测试")
    print("=" * 60)
    
    stardict_path = '/Users/renqing/Downloads/scholaragent/stardict.db'
    
    # 创建词典实例
    trie_dict = TrieDictionary()
    stardict_dict = StarDictSQLite(stardict_path)
    simple_dict = SimpleDictionary()
    
    # 加载词典
    print("\n1. 加载词典...")
    trie_dict.load_dictionary(stardict_path)
    stardict_dict.load_dictionary()
    simple_dict.load_dictionary()
    
    # 测试单词（从数据库中获取真实存在的单词）
    import sqlite3
    conn = sqlite3.connect(stardict_path)
    cursor = conn.cursor()
    
    # 获取一些测试单词
    cursor.execute("SELECT word FROM stardict WHERE word GLOB '[a-z]*' ORDER BY RANDOM() LIMIT 20")
    test_words = [row[0] for row in cursor.fetchall()]
    conn.close()
    
    print(f"   选择了 {len(test_words)} 个测试单词")
    
    # 测试精确匹配
    print("\n2. 精确匹配测试...")
    trie_success = 0
    stardict_success = 0
    simple_success = 0
    
    for word in test_words:
        # Trie查询
        trie_result = trie_dict.lookup_word(word)
        if trie_result:
            trie_success += 1
        
        # StarDict查询
        stardict_result = stardict_dict.lookup_word(word)
        if stardict_result:
            stardict_success += 1
        
        # Simple Dictionary查询
        simple_result = simple_dict.lookup_word(word)
        if simple_result:
            simple_success += 1
    
    print(f"   - Trie成功: {trie_success}/{len(test_words)}")
    print(f"   - StarDict成功: {stardict_success}/{len(test_words)}")
    print(f"   - Simple成功: {simple_success}/{len(test_words)}")
    
    # 测试大小写不敏感
    print("\n3. 大小写不敏感测试...")
    case_test_words = ['hello', 'Hello', 'HELLO', 'world', 'World', 'WORLD']
    
    for word in case_test_words:
        result = trie_dict.lookup_word(word)
        if result:
            print(f"   ✓ '{word}' -> {result.get('definition', '')[:50]}...")
        else:
            print(f"   ✗ '{word}' -> 未找到")
    
    # 测试前缀匹配
    print("\n4. 前缀匹配测试...")
    prefixes = ['hel', 'wor', 'com', 'pyth']
    
    for prefix in prefixes:
        trie_results = trie_dict.search_words(prefix, limit=5)
        print(f"   '{prefix}*' -> {len(trie_results)} 个结果")
        for result in trie_results[:3]:
            print(f"     - {result}")
    
    return True

def test_performance():
    """测试性能"""
    print("\n" + "=" * 60)
    print("性能测试")
    print("=" * 60)
    
    stardict_path = '/Users/renqing/Downloads/scholaragent/stardict.db'
    
    # 创建词典实例
    trie_dict = TrieDictionary()
    stardict_dict = StarDictSQLite(stardict_path)
    
    # 加载词典
    trie_dict.load_dictionary(stardict_path)
    stardict_dict.load_dictionary()
    
    # 准备测试单词
    import sqlite3
    conn = sqlite3.connect(stardict_path)
    cursor = conn.cursor()
    cursor.execute("SELECT word FROM stardict WHERE word GLOB '[a-z]*' ORDER BY RANDOM() LIMIT 1000")
    test_words = [row[0] for row in cursor.fetchall()]
    conn.close()
    
    print(f"\n1. 测试 {len(test_words)} 个单词的查询性能...")
    
    # Trie测试
    start_time = time.time()
    trie_success = 0
    for word in test_words:
        result = trie_dict.lookup_word(word)
        if result:
            trie_success += 1
    trie_time = time.time() - start_time
    
    # StarDict测试
    start_time = time.time()
    stardict_success = 0
    for word in test_words:
        result = stardict_dict.lookup_word(word)
        if result:
            stardict_success += 1
    stardict_time = time.time() - start_time
    
    # 输出结果
    print("\n   性能对比:")
    print(f"   - Trie: {trie_time:.3f}秒, 平均 {(trie_time/len(test_words)*1000):.3f}ms/词")
    print(f"   - StarDict: {stardict_time:.3f}秒, 平均 {(stardict_time/len(test_words)*1000):.3f}ms/词")
    print(f"   - 性能提升: {stardict_time/trie_time:.1f}x")
    
    print(f"\n   成功查询对比:")
    print(f"   - Trie: {trie_success}/{len(test_words)}")
    print(f"   - StarDict: {stardict_success}/{len(test_words)}")
    
    return True

def test_api_compatibility():
    """测试API兼容性"""
    print("\n" + "=" * 60)
    print("API兼容性测试")
    print("=" * 60)
    
    # 测试管理命令中使用的TrieManager
    from apps.study.trie_builder import TrieManager
    
    stardict_path = '/Users/renqing/Downloads/scholaragent/stardict.py'
    cache_dir = '/tmp/trie_test'
    os.makedirs(cache_dir, exist_ok=True)
    
    manager = TrieManager(cache_dir=cache_dir)
    
    # 测试创建Trie
    print("\n1. 创建Trie...")
    trie = manager.create_trie(stardict_path, force_rebuild=False)
    
    if trie:
        info = trie.get_info()
        print(f"   - 词典标题: {info.get('BookTitle', 'Unknown')}")
        print(f"   - 单词数量: {info.get('WordCount', 0):,}")
        print(f"   - 加载状态: {'已加载' if info.get('is_loaded', False) else '未加载'}")
        
        # 测试API兼容性
        print("\n2. API方法测试...")
        
        # lookup_word
        result = trie.lookup_word("hello")
        print(f"   - lookup_word: {'成功' if result else '失败'}")
        
        # search_words
        results = trie.search_words("he", limit=5)
        print(f"   - search_words: 找到 {len(results)} 个结果")
        
        # get_info
        info = trie.get_info()
        print(f"   - get_info: {len(info)} 个字段")
        
        return True
    else:
        print("   - 创建失败")
        return False

if __name__ == "__main__":
    print("开始Trie实现测试...")
    
    # 功能测试
    test_correctness()
    
    # 性能测试
    test_performance()
    
    # API兼容性测试
    test_api_compatibility()
    
    print("\n" + "=" * 60)
    print("测试完成！")
    print("=" * 60)
