"""
Trie词典性能监控工具
用于测试和比较Trie词典与原有实现的性能
"""

import os
import time
import random
import logging
import statistics
from typing import List, Dict, Any
from .trie_dictionary import TrieDictionary
from .stardict_sqlite import StarDictSQLite
from .simple_dictionary import SimpleDictionary

logger = logging.getLogger(__name__)


class TriePerformanceMonitor:
    """Trie性能监控器"""
    
    def __init__(self, stardict_path: str):
        self.stardict_path = stardict_path
        self.test_words = []
        self.results = {}
    
    def prepare_test_data(self, count: int = 1000) -> None:
        """准备测试数据"""
        logger.info(f"准备 {count} 个测试单词...")
        
        # 从StarDict数据库中随机选择单词
        conn = None
        try:
            import sqlite3
            conn = sqlite3.connect(self.stardict_path)
            cursor = conn.cursor()
            
            # 获取所有单词
            cursor.execute("SELECT word FROM stardict ORDER BY RANDOM() LIMIT ?", (count,))
            words = [row[0] for row in cursor.fetchall()]
            
            # 添加一些常见单词
            common_words = ['hello', 'world', 'computer', 'dictionary', 'python', 
                          'programming', 'algorithm', 'database', 'performance', 'optimization']
            words.extend(common_words)
            
            # 去重并随机打乱
            self.test_words = list(set(words))
            random.shuffle(self.test_words)
            
            logger.info(f"准备了 {len(self.test_words)} 个测试单词")
            
        except Exception as e:
            logger.error(f"准备测试数据失败: {e}")
        finally:
            if conn:
                conn.close()
    
    def test_trie_dictionary(self) -> Dict[str, Any]:
        """测试Trie词典性能"""
        logger.info("测试Trie词典性能...")
        
        trie_dict = TrieDictionary()
        if not trie_dict.load_dictionary(self.stardict_path):
            logger.error("Trie词典加载失败")
            return {}
        
        results = {
            'name': 'Trie Dictionary',
            'lookup_times': [],
            'search_times': [],
            'autocomplete_times': [],
            'memory_usage': 0
        }
        
        # 测试精确查询
        logger.info("测试精确查询...")
        for word in self.test_words[:100]:  # 测试前100个单词
            start_time = time.time()
            result = trie_dict.lookup_word(word)
            elapsed = time.time() - start_time
            results['lookup_times'].append(elapsed)
        
        # 测试前缀搜索
        logger.info("测试前缀搜索...")
        prefixes = ['a', 'ab', 'abc', 'com', 'pro', 'pre']
        for prefix in prefixes:
            start_time = time.time()
            search_results = trie_dict.search_words(prefix, 20)
            elapsed = time.time() - start_time
            results['search_times'].append(elapsed)
        
        # 测试自动补全
        logger.info("测试自动补全...")
        partials = ['hel', 'wor', 'com', 'pro', 'pre']
        for partial in partials:
            start_time = time.time()
            autocomplete_results = trie_dict.trie.trie.autocomplete(partial, 10)
            elapsed = time.time() - start_time
            results['autocomplete_times'].append(elapsed)
        
        # 计算统计数据
        results['avg_lookup_time'] = statistics.mean(results['lookup_times'])
        results['median_lookup_time'] = statistics.median(results['lookup_times'])
        results['max_lookup_time'] = max(results['lookup_times'])
        results['min_lookup_time'] = min(results['lookup_times'])
        
        results['avg_search_time'] = statistics.mean(results['search_times'])
        results['avg_autocomplete_time'] = statistics.mean(results['autocomplete_times'])
        
        # 获取词典信息
        info = trie_dict.get_info()
        results['word_count'] = info.get('WordCount', 0)
        results['is_loaded'] = info.get('is_loaded', False)
        
        trie_dict.close()
        
        return results
    
    def test_stardict_sqlite(self) -> Dict[str, Any]:
        """测试StarDict SQLite性能"""
        logger.info("测试StarDict SQLite性能...")
        
        stardict = StarDictSQLite(self.stardict_path)
        if not stardict.load_dictionary():
            logger.error("StarDict SQLite加载失败")
            return {}
        
        results = {
            'name': 'StarDict SQLite',
            'lookup_times': [],
            'search_times': [],
            'memory_usage': 0
        }
        
        # 测试精确查询
        logger.info("测试精确查询...")
        for word in self.test_words[:100]:  # 测试前100个单词
            start_time = time.time()
            result = stardict.lookup_word(word)
            elapsed = time.time() - start_time
            results['lookup_times'].append(elapsed)
        
        # 测试前缀搜索
        logger.info("测试前缀搜索...")
        prefixes = ['a', 'ab', 'abc', 'com', 'pro', 'pre']
        for prefix in prefixes:
            start_time = time.time()
            search_results = stardict.search_words(prefix, 20)
            elapsed = time.time() - start_time
            results['search_times'].append(elapsed)
        
        # 计算统计数据
        results['avg_lookup_time'] = statistics.mean(results['lookup_times'])
        results['median_lookup_time'] = statistics.median(results['lookup_times'])
        results['max_lookup_time'] = max(results['lookup_times'])
        results['min_lookup_time'] = min(results['lookup_times'])
        
        results['avg_search_time'] = statistics.mean(results['search_times'])
        
        # 获取词典信息
        info = stardict.get_info()
        results['word_count'] = info.get('WordCount', 0)
        results['is_loaded'] = info.get('is_loaded', False)
        
        stardict.close()
        
        return results
    
    def test_simple_dictionary(self) -> Dict[str, Any]:
        """测试简单词典性能"""
        logger.info("测试简单词典性能...")
        
        simple_dict = SimpleDictionary()
        if not simple_dict.load_dictionary():
            logger.error("简单词典加载失败")
            return {}
        
        results = {
            'name': 'Simple Dictionary',
            'lookup_times': [],
            'search_times': [],
            'memory_usage': 0
        }
        
        # 测试精确查询
        logger.info("测试精确查询...")
        test_words = [word for word in self.test_words[:100] if word in simple_dict._built_in_dict]
        for word in test_words:
            start_time = time.time()
            result = simple_dict.lookup_word(word)
            elapsed = time.time() - start_time
            results['lookup_times'].append(elapsed)
        
        # 测试前缀搜索
        logger.info("测试前缀搜索...")
        prefixes = ['h', 'w', 'c', 'l', 'd']
        for prefix in prefixes:
            start_time = time.time()
            search_results = simple_dict.search_words(prefix, 20)
            elapsed = time.time() - start_time
            results['search_times'].append(elapsed)
        
        # 计算统计数据
        if results['lookup_times']:
            results['avg_lookup_time'] = statistics.mean(results['lookup_times'])
            results['median_lookup_time'] = statistics.median(results['lookup_times'])
            results['max_lookup_time'] = max(results['lookup_times'])
            results['min_lookup_time'] = min(results['lookup_times'])
        
        if results['search_times']:
            results['avg_search_time'] = statistics.mean(results['search_times'])
        
        # 获取词典信息
        info = simple_dict.get_info()
        results['word_count'] = info.get('word_count', 0)
        results['is_loaded'] = info.get('is_loaded', False)
        
        simple_dict.close()
        
        return results
    
    def run_performance_test(self) -> Dict[str, Any]:
        """运行完整的性能测试"""
        logger.info("开始性能测试...")
        
        # 准备测试数据
        self.prepare_test_data(1000)
        
        # 测试各种词典实现
        test_results = {}
        
        # 测试Trie词典
        try:
            test_results['trie'] = self.test_trie_dictionary()
        except Exception as e:
            logger.error(f"Trie词典测试失败: {e}")
            test_results['trie'] = {'name': 'Trie Dictionary', 'error': str(e)}
        
        # 测试StarDict SQLite
        try:
            test_results['stardict'] = self.test_stardict_sqlite()
        except Exception as e:
            logger.error(f"StarDict SQLite测试失败: {e}")
            test_results['stardict'] = {'name': 'StarDict SQLite', 'error': str(e)}
        
        # 测试简单词典
        try:
            test_results['simple'] = self.test_simple_dictionary()
        except Exception as e:
            logger.error(f"简单词典测试失败: {e}")
            test_results['simple'] = {'name': 'Simple Dictionary', 'error': str(e)}
        
        # 生成性能报告
        report = self.generate_performance_report(test_results)
        
        return report
    
    def generate_performance_report(self, test_results: Dict[str, Any]) -> Dict[str, Any]:
        """生成性能报告"""
        report = {
            'timestamp': time.time(),
            'test_summary': {},
            'performance_comparison': {},
            'recommendations': []
        }
        
        # 汇总测试结果
        for key, result in test_results.items():
            if 'error' in result:
                report['test_summary'][key] = {
                    'name': result.get('name', key),
                    'status': 'failed',
                    'error': result['error']
                }
            else:
                report['test_summary'][key] = {
                    'name': result.get('name', key),
                    'status': 'success',
                    'word_count': result.get('word_count', 0),
                    'avg_lookup_time': result.get('avg_lookup_time', 0),
                    'avg_search_time': result.get('avg_search_time', 0),
                    'avg_autocomplete_time': result.get('avg_autocomplete_time', 0)
                }
        
        # 性能比较
        successful_results = {k: v for k, v in test_results.items() if 'error' not in v}
        
        if len(successful_results) >= 2:
            # 查找最快的实现
            fastest_lookup = min(successful_results.items(), 
                              key=lambda x: x[1].get('avg_lookup_time', float('inf')))
            fastest_search = min(successful_results.items(), 
                             key=lambda x: x[1].get('avg_search_time', float('inf')))
            
            report['performance_comparison'] = {
                'fastest_lookup': {
                    'implementation': fastest_lookup[0],
                    'name': fastest_lookup[1]['name'],
                    'time': fastest_lookup[1]['avg_lookup_time']
                },
                'fastest_search': {
                    'implementation': fastest_search[0],
                    'name': fastest_search[1]['name'],
                    'time': fastest_search[1]['avg_search_time']
                }
            }
            
            # 计算性能提升
            trie_result = successful_results.get('trie')
            stardict_result = successful_results.get('stardict')
            
            if trie_result and stardict_result:
                lookup_improvement = stardict_result.get('avg_lookup_time', 0) / trie_result.get('avg_lookup_time', 1)
                search_improvement = stardict_result.get('avg_search_time', 0) / trie_result.get('avg_search_time', 1)
                
                report['performance_comparison']['trie_vs_stardict'] = {
                    'lookup_improvement': lookup_improvement,
                    'search_improvement': search_improvement
                }
        
        # 生成建议
        if 'trie' in successful_results:
            report['recommendations'].append("Trie词典表现优异，建议在生产环境中使用")
        
        if 'stardict' in successful_results:
            report['recommendations'].append("StarDict SQLite可以作为Trie词典的备用方案")
        
        return report
    
    def print_report(self, report: Dict[str, Any]) -> None:
        """打印性能报告"""
        print("\n" + "="*60)
        print("Trie词典性能测试报告")
        print("="*60)
        
        # 测试摘要
        print("\n测试摘要:")
        for key, summary in report['test_summary'].items():
            print(f"\n{summary['name']}:")
            if summary['status'] == 'success':
                print(f"  状态: 成功")
                print(f"  单词数量: {summary['word_count']:,}")
                print(f"  平均查询时间: {summary['avg_lookup_time']*1000:.3f} ms")
                print(f"  平均搜索时间: {summary['avg_search_time']*1000:.3f} ms")
                if 'avg_autocomplete_time' in summary:
                    print(f"  平均自动补全时间: {summary['avg_autocomplete_time']*1000:.3f} ms")
            else:
                print(f"  状态: 失败 - {summary['error']}")
        
        # 性能比较
        if report['performance_comparison']:
            print("\n性能比较:")
            comp = report['performance_comparison']
            
            if 'fastest_lookup' in comp:
                fastest = comp['fastest_lookup']
                print(f"  最快查询: {fastest['name']} ({fastest['time']*1000:.3f} ms)")
            
            if 'fastest_search' in comp:
                fastest = comp['fastest_search']
                print(f"  最快搜索: {fastest['name']} ({fastest['time']*1000:.3f} ms)")
            
            if 'trie_vs_stardict' in comp:
                comparison = comp['trie_vs_stardict']
                print(f"  Trie vs StarDict:")
                print(f"    查询性能提升: {comparison['lookup_improvement']:.1f}x")
                print(f"    搜索性能提升: {comparison['search_improvement']:.1f}x")
        
        # 建议
        if report['recommendations']:
            print("\n建议:")
            for rec in report['recommendations']:
                print(f"  • {rec}")
        
        print("\n" + "="*60)


def run_performance_test(stardict_path: str = None) -> None:
    """运行性能测试"""
    if not stardict_path:
        # 默认使用项目根目录下的stardict.db
        project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))
        stardict_path = os.path.join(project_root, 'stardict.db')
    
    if not os.path.exists(stardict_path):
        print(f"错误: StarDict数据库文件不存在: {stardict_path}")
        return
    
    # 创建性能监控器
    monitor = TriePerformanceMonitor(stardict_path)
    
    # 运行测试
    report = monitor.run_performance_test()
    
    # 打印报告
    monitor.print_report(report)
    
    # 保存报告到文件
    report_file = os.path.join(os.path.dirname(stardict_path), 'trie_performance_report.json')
    import json
    with open(report_file, 'w', encoding='utf-8') as f:
        json.dump(report, f, indent=2, ensure_ascii=False)
    
    print(f"\n详细报告已保存到: {report_file}")


if __name__ == '__main__':
    # 如果直接运行此脚本，执行性能测试
    run_performance_test()