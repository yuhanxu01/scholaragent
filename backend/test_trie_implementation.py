#!/usr/bin/env python
"""
Trie词典实现测试脚本
用于验证新实现的性能和兼容性
"""

import os
import sys
import time
import django
from django.conf import settings

# 设置Django环境
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.study.trie_dictionary import TrieDictionary
from apps.study.stardict_sqlite import StarDictSQLite
from apps.study.simple_dictionary import SimpleDictionary
from apps.study.vocabulary_views import get_dictionary_instance


def test_basic_functionality():
    """测试基本功能"""
    print("="*60)
    print("测试基本功能")
    print("="*60)
    
    # 获取StarDict数据库路径
    stardict_path = os.path.join(os.path.dirname(__file__), '..', 'stardict.db')
    
    if not os.path.exists(stardict_path):
        print(f"错误: StarDict数据库文件不存在: {stardict_path}")
        return False
    
    # 测试Trie词典
    print("\n1. 测试Trie词典...")
    try:
        trie_dict = TrieDictionary()
        if trie_dict.load_dictionary(stardict_path):
            print("  ✓ Trie词典加载成功")
            
            # 测试查询
            test_words = ['hello', 'world', 'computer', 'python', 'algorithm']
            for word in test_words:
                result = trie_dict.lookup_word(word)
                if result:
                    print(f"  ✓ 查询 '{word}': {result.get('definition', '')[:50]}...")
                else:
                    print(f"  ✗ 查询 '{word}': 未找到")
            
            # 测试搜索
            search_results = trie_dict.search_words('com', 10)
            print(f"  ✓ 搜索 'com': 返回 {len(search_results)} 个结果")
            
            trie_dict.close()
            print("  ✓ Trie词典测试通过")
        else:
            print("  ✗ Trie词典加载失败")
            return False
    except Exception as e:
        print(f"  ✗ Trie词典测试异常: {e}")
        return False
    
    # 测试StarDict SQLite
    print("\n2. 测试StarDict SQLite...")
    try:
        stardict = StarDictSQLite(stardict_path)
        if stardict.load_dictionary():
            print("  ✓ StarDict SQLite加载成功")
            
            # 测试查询
            test_words = ['hello', 'world', 'computer', 'python', 'algorithm']
            for word in test_words:
                result = stardict.lookup_word(word)
                if result:
                    print(f"  ✓ 查询 '{word}': {result.get('definition', '')[:50]}...")
                else:
                    print(f"  ✗ 查询 '{word}': 未找到")
            
            stardict.close()
            print("  ✓ StarDict SQLite测试通过")
        else:
            print("  ✗ StarDict SQLite加载失败")
            return False
    except Exception as e:
        print(f"  ✗ StarDict SQLite测试异常: {e}")
        return False
    
    # 测试混合词典（通过vocabulary_views）
    print("\n3. 测试混合词典...")
    try:
        hybrid_dict = get_dictionary_instance()
        if hybrid_dict:
            print("  ✓ 混合词典加载成功")
            
            # 测试查询
            test_words = ['hello', 'world', 'computer', 'python', 'algorithm']
            for word in test_words:
                result = hybrid_dict.lookup_word(word)
                if result:
                    print(f"  ✓ 查询 '{word}': {result.get('definition', '')[:50]}...")
                else:
                    print(f"  ✗ 查询 '{word}': 未找到")
            
            # 测试搜索
            search_results = hybrid_dict.search_words('com', 10)
            print(f"  ✓ 搜索 'com': 返回 {len(search_results)} 个结果")
            
            print("  ✓ 混合词典测试通过")
        else:
            print("  ✗ 混合词典加载失败")
            return False
    except Exception as e:
        print(f"  ✗ 混合词典测试异常: {e}")
        return False
    
    return True


def test_performance():
    """测试性能"""
    print("\n" + "="*60)
    print("测试性能")
    print("="*60)
    
    # 获取StarDict数据库路径
    stardict_path = os.path.join(os.path.dirname(__file__), '..', 'stardict.db')
    
    if not os.path.exists(stardict_path):
        print(f"错误: StarDict数据库文件不存在: {stardict_path}")
        return False
    
    # 准备测试单词
    test_words = ['hello', 'world', 'computer', 'python', 'algorithm', 
                  'database', 'programming', 'performance', 'optimization', 'structure']
    
    # 测试Trie词典性能
    print("\n1. 测试Trie词典性能...")
    try:
        trie_dict = TrieDictionary()
        if trie_dict.load_dictionary(stardict_path):
            # 预热
            for word in test_words:
                trie_dict.lookup_word(word)
            
            # 测试查询性能
            start_time = time.time()
            for _ in range(100):
                for word in test_words:
                    trie_dict.lookup_word(word)
            trie_time = time.time() - start_time
            
            print(f"  ✓ Trie词典: 100次循环查询 {len(test_words)} 个单词，耗时 {trie_time:.3f} 秒")
            print(f"  ✓ 平均每次查询: {trie_time/(100*len(test_words))*1000:.3f} 毫秒")
            
            trie_dict.close()
        else:
            print("  ✗ Trie词典加载失败")
            return False
    except Exception as e:
        print(f"  ✗ Trie词典性能测试异常: {e}")
        return False
    
    # 测试StarDict SQLite性能
    print("\n2. 测试StarDict SQLite性能...")
    try:
        stardict = StarDictSQLite(stardict_path)
        if stardict.load_dictionary():
            # 预热
            for word in test_words:
                stardict.lookup_word(word)
            
            # 测试查询性能
            start_time = time.time()
            for _ in range(100):
                for word in test_words:
                    stardict.lookup_word(word)
            sqlite_time = time.time() - start_time
            
            print(f"  ✓ StarDict SQLite: 100次循环查询 {len(test_words)} 个单词，耗时 {sqlite_time:.3f} 秒")
            print(f"  ✓ 平均每次查询: {sqlite_time/(100*len(test_words))*1000:.3f} 毫秒")
            
            stardict.close()
        else:
            print("  ✗ StarDict SQLite加载失败")
            return False
    except Exception as e:
        print(f"  ✗ StarDict SQLite性能测试异常: {e}")
        return False
    
    return True


def test_api_compatibility():
    """测试API兼容性"""
    print("\n" + "="*60)
    print("测试API兼容性")
    print("="*60)
    
    # 获取StarDict数据库路径
    stardict_path = os.path.join(os.path.dirname(__file__), '..', 'stardict.db')
    
    if not os.path.exists(stardict_path):
        print(f"错误: StarDict数据库文件不存在: {stardict_path}")
        return False
    
    # 测试Trie词典API
    print("\n1. 测试Trie词典API兼容性...")
    try:
        trie_dict = TrieDictionary()
        if trie_dict.load_dictionary(stardict_path):
            # 测试lookup_word方法
            result = trie_dict.lookup_word('hello')
            if result and isinstance(result, dict):
                required_keys = ['word', 'pronunciation', 'definition', 'translation', 'examples', 'is_fuzzy_match', 'source']
                missing_keys = [key for key in required_keys if key not in result]
                if not missing_keys:
                    print("  ✓ lookup_word方法返回格式正确")
                else:
                    print(f"  ✗ lookup_word方法缺少必需字段: {missing_keys}")
                    return False
            else:
                print("  ✗ lookup_word方法返回格式错误")
                return False
            
            # 测试search_words方法
            results = trie_dict.search_words('hello', 10)
            if isinstance(results, list):
                print("  ✓ search_words方法返回格式正确")
            else:
                print("  ✗ search_words方法返回格式错误")
                return False
            
            # 测试get_word_count方法
            count = trie_dict.get_word_count()
            if isinstance(count, int) and count > 0:
                print("  ✓ get_word_count方法返回正确")
            else:
                print("  ✗ get_word_count方法返回错误")
                return False
            
            # 测试get_info方法
            info = trie_dict.get_info()
            if isinstance(info, dict) and 'WordCount' in info:
                print("  ✓ get_info方法返回正确")
            else:
                print("  ✗ get_info方法返回错误")
                return False
            
            trie_dict.close()
            print("  ✓ Trie词典API兼容性测试通过")
        else:
            print("  ✗ Trie词典加载失败")
            return False
    except Exception as e:
        print(f"  ✗ Trie词典API兼容性测试异常: {e}")
        return False
    
    return True


def main():
    """主函数"""
    print("Trie词典实现测试")
    print("="*60)
    
    # 运行所有测试
    tests = [
        ("基本功能测试", test_basic_functionality),
        ("性能测试", test_performance),
        ("API兼容性测试", test_api_compatibility)
    ]
    
    results = []
    for test_name, test_func in tests:
        try:
            result = test_func()
            results.append((test_name, result))
        except Exception as e:
            print(f"\n{test_name}发生异常: {e}")
            results.append((test_name, False))
    
    # 显示测试结果
    print("\n" + "="*60)
    print("测试结果汇总")
    print("="*60)
    
    passed = 0
    total = len(results)
    
    for test_name, result in results:
        status = "通过" if result else "失败"
        print(f"{test_name}: {status}")
        if result:
            passed += 1
    
    print(f"\n总计: {passed}/{total} 个测试通过")
    
    if passed == total:
        print("🎉 所有测试通过！Trie词典实现成功！")
        return 0
    else:
        print("❌ 部分测试失败，请检查实现")
        return 1


if __name__ == '__main__':
    sys.exit(main())