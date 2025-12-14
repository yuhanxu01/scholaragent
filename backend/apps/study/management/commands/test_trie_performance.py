"""
测试Trie词典性能的管理命令
"""

import os
import json
from django.core.management.base import BaseCommand, CommandError
from apps.study.trie_performance import TriePerformanceMonitor


class Command(BaseCommand):
    help = '测试Trie词典性能并与现有实现进行比较'

    def add_arguments(self, parser):
        parser.add_argument(
            '--stardict-path',
            type=str,
            help='StarDict数据库文件路径（可选，默认使用项目根目录下的stardict.db）'
        )
        parser.add_argument(
            '--test-count',
            type=int,
            default=1000,
            help='测试单词数量（默认1000）'
        )
        parser.add_argument(
            '--output-file',
            type=str,
            help='性能报告输出文件路径（可选）'
        )
        parser.add_argument(
            '--verbose',
            action='store_true',
            help='显示详细输出'
        )

    def handle(self, *args, **options):
        # 获取StarDict数据库路径
        stardict_path = options.get('stardict_path')
        if not stardict_path:
            # 默认使用项目根目录下的stardict.db
            project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))
            stardict_path = os.path.join(project_root, 'stardict.db')
        
        if not os.path.exists(stardict_path):
            raise CommandError(f'StarDict数据库文件不存在: {stardict_path}')
        
        test_count = options.get('test_count', 1000)
        verbose = options.get('verbose', False)
        output_file = options.get('output_file')
        
        self.stdout.write(f'StarDict数据库路径: {stardict_path}')
        self.stdout.write(f'测试单词数量: {test_count}')
        
        # 创建性能监控器
        monitor = TriePerformanceMonitor(stardict_path)
        
        # 准备测试数据
        self.stdout.write('准备测试数据...')
        monitor.prepare_test_data(test_count)
        
        # 运行性能测试
        self.stdout.write('开始性能测试...')
        report = monitor.run_performance_test()
        
        # 显示结果
        if verbose:
            monitor.print_report(report)
        else:
            # 简化输出
            self.stdout.write('\n性能测试摘要:')
            for key, summary in report['test_summary'].items():
                if summary['status'] == 'success':
                    self.stdout.write(
                        f"  {summary['name']}: "
                        f"查询 {summary['avg_lookup_time']*1000:.3f}ms, "
                        f"搜索 {summary['avg_search_time']*1000:.3f}ms"
                    )
                else:
                    self.stdout.write(f"  {summary['name']}: 失败 - {summary['error']}")
            
            if report['performance_comparison']:
                comp = report['performance_comparison']
                if 'trie_vs_stardict' in comp:
                    comparison = comp['trie_vs_stardict']
                    self.stdout.write(
                        f"\nTrie vs StarDict 性能提升: "
                        f"查询 {comparison['lookup_improvement']:.1f}x, "
                        f"搜索 {comparison['search_improvement']:.1f}x"
                    )
        
        # 保存报告
        if output_file:
            with open(output_file, 'w', encoding='utf-8') as f:
                json.dump(report, f, indent=2, ensure_ascii=False)
            self.stdout.write(f'\n详细报告已保存到: {output_file}')
        else:
            # 默认保存到StarDict同目录
            default_output = os.path.join(os.path.dirname(stardict_path), 'trie_performance_report.json')
            with open(default_output, 'w', encoding='utf-8') as f:
                json.dump(report, f, indent=2, ensure_ascii=False)
            self.stdout.write(f'\n详细报告已保存到: {default_output}')
        
        self.stdout.write(self.style.SUCCESS('性能测试完成！'))