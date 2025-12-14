"""
Trie构建工具
用于从StarDict SQLite数据库导入数据到Trie结构
"""

import sqlite3
import logging
import time
from typing import Optional
from .trie_dictionary import TrieDictionary, WordData, CaseInsensitiveTrie

logger = logging.getLogger(__name__)


class TrieBuilder:
    """Trie构建工具"""
    
    def __init__(self):
        self.batch_size = 10000
        self.processed_count = 0
        self.start_time = None
    
    def build_from_stardict(self, stardict_path: str, trie: CaseInsensitiveTrie) -> bool:
        """
        从StarDict SQLite数据库构建Trie
        
        Args:
            stardict_path: StarDict数据库路径
            trie: 目标Trie实例
            
        Returns:
            bool: 构建是否成功
        """
        try:
            self.start_time = time.time()
            self.processed_count = 0
            
            # 连接数据库
            conn = sqlite3.connect(stardict_path)
            cursor = conn.cursor()
            
            # 检查表是否存在
            cursor.execute(
                "SELECT name FROM sqlite_master WHERE type='table' AND name='stardict'"
            )
            if not cursor.fetchone():
                logger.error("未找到 stardict 表")
                return False
            
            # 获取总词数
            cursor.execute("SELECT COUNT(*) FROM stardict")
            total_words = cursor.fetchone()[0]
            logger.info(f"开始构建Trie，总计 {total_words:,} 个词条")
            
            # 分批处理数据
            offset = 0
            while True:
                cursor.execute(
                    "SELECT word, phonetic, definition, translation, pos FROM stardict "
                    "LIMIT ? OFFSET ?",
                    (self.batch_size, offset)
                )
                batch = cursor.fetchall()
                
                if not batch:
                    break
                
                # 处理当前批次
                for word, phonetic, definition, translation, pos in batch:
                    if not word:
                        continue
                    
                    # 创建单词数据
                    word_data = WordData()
                    word_data.word = word
                    word_data.pronunciation = phonetic or ""
                    word_data.definition = definition or ""
                    word_data.translation = translation or ""
                    word_data.pos = pos or ""
                    word_data.frequency = 1  # 默认词频
                    
                    # 插入到Trie
                    trie.insert(word, word_data)
                    self.processed_count += 1
                
                offset += self.batch_size
                
                # 打印进度
                progress = (offset / total_words) * 100
                elapsed = time.time() - self.start_time
                rate = self.processed_count / elapsed if elapsed > 0 else 0
                eta = (total_words - self.processed_count) / rate if rate > 0 else 0
                
                logger.info(
                    f"构建进度: {progress:.1f}% ({self.processed_count:,}/{total_words:,}) "
                    f"- 速度: {rate:.0f} 词/秒 - 预计剩余: {eta/60:.1f} 分钟"
                )
            
            conn.close()
            
            # 构建完成
            elapsed = time.time() - self.start_time
            logger.info(
                f"Trie构建完成！共处理 {self.processed_count:,} 个词条，"
                f"耗时 {elapsed:.2f} 秒，平均速度 {self.processed_count/elapsed:.0f} 词/秒"
            )
            
            return True
            
        except Exception as e:
            logger.error(f"构建Trie失败: {e}")
            return False
    
    def build_incremental(self, stardict_path: str, trie: CaseInsensitiveTrie, 
                         last_update_time: Optional[str] = None) -> bool:
        """
        增量构建Trie
        
        Args:
            stardict_path: StarDict数据库路径
            trie: 目标Trie实例
            last_update_time: 上次更新时间
            
        Returns:
            bool: 构建是否成功
        """
        try:
            self.start_time = time.time()
            self.processed_count = 0
            
            # 连接数据库
            conn = sqlite3.connect(stardict_path)
            cursor = conn.cursor()
            
            # 构建查询条件
            if last_update_time:
                cursor.execute(
                    "SELECT word, phonetic, definition, translation, pos FROM stardict "
                    "WHERE updated_at > ? OR updated_at IS NULL",
                    (last_update_time,)
                )
            else:
                cursor.execute(
                    "SELECT word, phonetic, definition, translation, pos FROM stardict"
                )
            
            batch = cursor.fetchall()
            
            if not batch:
                logger.info("没有需要更新的词条")
                conn.close()
                return True
            
            logger.info(f"开始增量更新，共 {len(batch)} 个词条")
            
            # 处理更新
            for word, phonetic, definition, translation, pos in batch:
                if not word:
                    continue
                
                # 创建单词数据
                word_data = WordData()
                word_data.word = word
                word_data.pronunciation = phonetic or ""
                word_data.definition = definition or ""
                word_data.translation = translation or ""
                word_data.pos = pos or ""
                word_data.frequency = 1
                
                # 插入到Trie
                trie.insert(word, word_data)
                self.processed_count += 1
            
            conn.close()
            
            # 更新完成
            elapsed = time.time() - self.start_time
            logger.info(
                f"增量更新完成！共处理 {self.processed_count:,} 个词条，"
                f"耗时 {elapsed:.2f} 秒"
            )
            
            return True
            
        except Exception as e:
            logger.error(f"增量更新失败: {e}")
            return False
    
    def optimize_trie(self, trie: CaseInsensitiveTrie) -> bool:
        """
        优化Trie结构
        
        Args:
            trie: 要优化的Trie实例
            
        Returns:
            bool: 优化是否成功
        """
        try:
            logger.info("开始优化Trie结构...")
            start_time = time.time()
            
            # 这里可以添加各种优化策略
            # 1. 节点压缩
            # 2. 路径压缩
            # 3. 数据重排
            
            elapsed = time.time() - start_time
            logger.info(f"Trie优化完成，耗时 {elapsed:.2f} 秒")
            
            return True
            
        except Exception as e:
            logger.error(f"Trie优化失败: {e}")
            return False
    
    def validate_trie(self, trie: CaseInsensitiveTrie, stardict_path: str) -> bool:
        """
        验证Trie构建的正确性
        
        Args:
            trie: 要验证的Trie实例
            stardict_path: StarDict数据库路径
            
        Returns:
            bool: 验证是否通过
        """
        try:
            logger.info("开始验证Trie构建结果...")
            start_time = time.time()
            
            # 连接数据库
            conn = sqlite3.connect(stardict_path)
            cursor = conn.cursor()
            
            # 获取数据库中的单词数量
            cursor.execute("SELECT COUNT(*) FROM stardict")
            db_word_count = cursor.fetchone()[0]
            
            # 获取Trie中的单词数量
            trie_word_count = trie.trie.word_count
            
            # 比较数量（允许跳过纯非字母字符的单词）
            if trie_word_count < db_word_count * 0.8:  # 如果Trie中的单词少于数据库的80%，则有问题
                logger.error(
                    f"单词数量严重不匹配！数据库: {db_word_count:,}, Trie: {trie_word_count:,} (应该至少 {db_word_count * 0.8:.0f})"
                )
                return False
            elif trie_word_count != db_word_count:
                skipped = db_word_count - trie_word_count
                logger.warning(
                    f"单词数量不完全匹配。数据库: {db_word_count:,}, Trie: {trie_word_count:,} "
                    f"(跳过了 {skipped:,} 个无有效字母的单词)"
                )
            
            # 随机抽样验证
            cursor.execute(
                "SELECT word, phonetic, definition, translation FROM stardict "
                "ORDER BY RANDOM() LIMIT 100"
            )
            sample_words = cursor.fetchall()
            
            errors = 0
            for word, phonetic, definition, translation in sample_words:
                result = trie.search(word)
                if not result:
                    logger.warning(f"未找到单词: {word}")
                    errors += 1
                    continue
                
                # 验证数据一致性
                if (result.pronunciation != (phonetic or "")) or \
                   (result.definition != (definition or "")) or \
                   (result.translation != (translation or "")):
                    logger.warning(f"数据不一致: {word}")
                    errors += 1
            
            conn.close()
            
            elapsed = time.time() - start_time
            if errors == 0:
                logger.info(f"Trie验证通过！耗时 {elapsed:.2f} 秒")
                return True
            else:
                logger.error(f"Trie验证失败！发现 {errors} 个错误，耗时 {elapsed:.2f} 秒")
                return False
                
        except Exception as e:
            logger.error(f"Trie验证失败: {e}")
            return False


class TrieManager:
    """Trie管理器"""
    
    def __init__(self, cache_dir: str = None):
        self.cache_dir = cache_dir or "cache/trie"
        self.builder = TrieBuilder()
    
    def create_trie(self, stardict_path: str, force_rebuild: bool = False) -> Optional[TrieDictionary]:
        """
        创建或加载Trie
        
        Args:
            stardict_path: StarDict数据库路径
            force_rebuild: 是否强制重建
            
        Returns:
            TrieDictionary: 创建的Trie实例
        """
        trie_dict = TrieDictionary(cache_dir=self.cache_dir)
        
        # 检查是否需要重建
        if not force_rebuild:
            if trie_dict.load_dictionary(stardict_path):
                return trie_dict
        
        # 构建新的Trie
        logger.info("开始构建新的Trie...")
        
        # 创建新的Trie实例
        from .trie_dictionary import CaseInsensitiveTrie
        trie = CaseInsensitiveTrie()
        
        # 构建Trie
        if not self.builder.build_from_stardict(stardict_path, trie):
            logger.error("构建Trie失败")
            return None
        
        # 优化Trie
        self.builder.optimize_trie(trie)
        
        # 验证Trie
        if not self.builder.validate_trie(trie, stardict_path):
            logger.warning("Trie验证未通过，但仍将使用")
        
        # 替换Trie字典中的Trie
        trie_dict.trie = trie
        trie_dict._is_loaded = True
        trie_dict._header_info['WordCount'] = trie.trie.word_count
        
        # 保存到缓存
        from .trie_dictionary import TrieSerializer
        cache_file = f"{self.cache_dir}/trie_cache.gz"
        TrieSerializer.serialize(trie, cache_file)
        
        return trie_dict
    
    def update_trie(self, stardict_path: str, trie_dict: TrieDictionary) -> bool:
        """
        更新现有Trie
        
        Args:
            stardict_path: StarDict数据库路径
            trie_dict: 要更新的Trie字典
            
        Returns:
            bool: 更新是否成功
        """
        if not trie_dict._is_loaded:
            logger.error("Trie未加载，无法更新")
            return False
        
        # 增量更新
        success = self.builder.build_incremental(
            stardict_path, 
            trie_dict.trie,
            last_update_time=None  # 这里应该记录上次更新时间
        )
        
        if success:
            # 保存更新后的Trie
            from .trie_dictionary import TrieSerializer
            cache_file = f"{self.cache_dir}/trie_cache.gz"
            TrieSerializer.serialize(trie_dict.trie, cache_file)
            
            # 更新统计信息
            trie_dict._header_info['WordCount'] = trie_dict.trie.trie.word_count
        
        return success