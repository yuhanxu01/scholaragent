"""
构建Trie词典的管理命令
"""

import os
import logging
from django.core.management.base import BaseCommand, CommandError
from django.conf import settings
from apps.study.trie_builder import TrieManager

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = '构建Trie词典，从StarDict数据库导入数据'

    def add_arguments(self, parser):
        parser.add_argument(
            '--stardict-path',
            type=str,
            help='StarDict数据库文件路径（可选，默认使用项目根目录下的stardict.db）'
        )
        parser.add_argument(
            '--force-rebuild',
            action='store_true',
            help='强制重建Trie，即使缓存已存在'
        )
        parser.add_argument(
            '--cache-dir',
            type=str,
            help='Trie缓存目录（可选）'
        )
        parser.add_argument(
            '--validate-only',
            action='store_true',
            help='仅验证现有Trie，不重建'
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
        
        # 获取缓存目录
        cache_dir = options.get('cache_dir')
        if not cache_dir:
            cache_dir = os.path.join(settings.BASE_DIR, 'cache', 'trie')
        
        # 创建Trie管理器
        trie_manager = TrieManager(cache_dir=cache_dir)
        
        self.stdout.write(f'StarDict数据库路径: {stardict_path}')
        self.stdout.write(f'缓存目录: {cache_dir}')
        
        if options.get('validate_only'):
            # 仅验证现有Trie
            self.stdout.write('验证现有Trie...')
            trie_dict = trie_manager.create_trie(stardict_path, force_rebuild=False)
            if trie_dict:
                info = trie_dict.get_info()
                self.stdout.write(
                    self.style.SUCCESS(
                        f'Trie验证成功！\n'
                        f'词典标题: {info.get("BookTitle", "Unknown")}\n'
                        f'单词数量: {info.get("WordCount", 0):,}\n'
                        f'是否已加载: {info.get("is_loaded", False)}'
                    )
                )
            else:
                self.stdout.write(self.style.ERROR('Trie验证失败'))
            return
        
        # 构建Trie
        force_rebuild = options.get('force_rebuild', False)
        self.stdout.write(f'开始构建Trie（强制重建: {force_rebuild}）...')
        
        try:
            trie_dict = trie_manager.create_trie(stardict_path, force_rebuild=force_rebuild)
            
            if trie_dict:
                info = trie_dict.get_info()
                self.stdout.write(
                    self.style.SUCCESS(
                        f'Trie构建成功！\n'
                        f'词典标题: {info.get("BookTitle", "Unknown")}\n'
                        f'单词数量: {info.get("WordCount", 0):,}\n'
                        f'是否已加载: {info.get("is_loaded", False)}\n'
                        f'缓存目录: {info.get("cache_dir", "Unknown")}'
                    )
                )
                
                # 测试查询功能
                self.stdout.write('\n测试查询功能...')
                test_words = ['hello', 'world', 'computer', 'dictionary', 'python']
                
                for word in test_words:
                    result = trie_dict.lookup_word(word)
                    if result:
                        self.stdout.write(
                            f'  ✓ "{word}": {result.get("definition", "")[:50]}...'
                        )
                    else:
                        self.stdout.write(f'  ✗ "{word}": 未找到')
                
                self.stdout.write(self.style.SUCCESS('\nTrie词典构建完成并测试通过！'))
            else:
                self.stdout.write(self.style.ERROR('Trie构建失败'))
                
        except Exception as e:
            logger.exception("构建Trie时发生错误")
            raise CommandError(f'构建Trie失败: {str(e)}')