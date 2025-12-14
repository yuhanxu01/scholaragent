"""
高效的Trie树词典搜索实现
基于设计文档EFFICIENT_TRIE_DICTIONARY_DESIGN.md
"""

import os
import gzip
import pickle
import sqlite3
import logging
import time
import threading
from typing import Dict, List, Optional, Tuple, Any
from collections import deque
from dataclasses import dataclass
from pathlib import Path

logger = logging.getLogger(__name__)


@dataclass
class WordData:
    """单词数据结构"""
    word: str = ""
    pronunciation: str = ""
    definition: str = ""
    translation: str = ""
    examples: List[str] = None
    frequency: int = 0
    pos: str = ""  # 词性
    
    def __post_init__(self):
        if self.examples is None:
            self.examples = []


class CompactTrieNode:
    """紧凑型Trie节点，针对大型词典优化"""
    
    __slots__ = ['children', 'is_word_end', 'word_data_id']
    
    def __init__(self):
        # 使用数组而非字典存储子节点，节省内存
        # 只支持a-z，忽略大小写
        self.children = [None] * 26
        self.is_word_end = False
        self.word_data_id = -1  # 指向外部存储的单词数据


class TripleArrayTrie:
    """三数组Trie实现，内存效率极高"""
    
    def __init__(self):
        self.base = []    # 基础数组
        self.check = []   # 检查数组
        self.next = []    # 下一个数组
        self.data_store = {}  # 单词数据存储
        
    def build_from_compact_trie(self, root: CompactTrieNode, data_store: Dict[int, WordData]):
        """从紧凑Trie构建三数组Trie"""
        # 初始化数组
        self.base = [0] * 1000000  # 预分配空间
        self.check = [0] * 1000000
        self.next = [0] * 1000000
        self.data_store = data_store.copy()
        
        # BFS遍历Trie并构建三数组
        node_queue = deque()
        node_queue.append((root, 0, ''))  # (node, state, prefix)
        
        state_counter = 1
        while node_queue:
            node, current_state, prefix = node_queue.popleft()
            
            if node.is_word_end:
                # 标记单词结束
                if node.word_data_id >= 0:
                    self.base[current_state] = -node.word_data_id - 1  # 负数表示单词结束
            
            # 处理子节点
            for i, child in enumerate(node.children):
                if child:
                    char = chr(i + ord('a'))
                    new_prefix = prefix + char
                    new_state = state_counter
                    
                    # 设置转移
                    char_code = i + 1  # 1-26 for a-z
                    self.base[current_state] = new_state if self.base[current_state] >= 0 else self.base[current_state]
                    self.check[new_state] = current_state
                    self.next[new_state] = char_code
                    
                    state_counter += 1
                    node_queue.append((child, new_state, new_prefix))
                    
                    # 动态扩展数组
                    if new_state >= len(self.base):
                        self.extend_arrays(new_state + 100000)
        
        # 截断未使用的空间
        self.base = self.base[:state_counter]
        self.check = self.check[:state_counter]
        self.next = self.next[:state_counter]
    
    def extend_arrays(self, new_size: int):
        """扩展数组大小"""
        current_size = len(self.base)
        if new_size > current_size:
            self.base.extend([0] * (new_size - current_size))
            self.check.extend([0] * (new_size - current_size))
            self.next.extend([0] * (new_size - current_size))


class MemoryCache:
    """内存缓存层"""
    
    def __init__(self, max_size: int = 1000):
        self.cache = {}
        self.max_size = max_size
        self.access_order = []  # LRU实现
        self.lock = threading.RLock()
    
    def get(self, key: str) -> Optional[Any]:
        """获取缓存项"""
        with self.lock:
            if key in self.cache:
                # 更新访问顺序
                self.access_order.remove(key)
                self.access_order.append(key)
                return self.cache[key]
            return None
    
    def put(self, key: str, value: Any) -> None:
        """添加缓存项"""
        with self.lock:
            if len(self.cache) >= self.max_size:
                # 移除最久未使用的项
                oldest = self.access_order.pop(0)
                del self.cache[oldest]
            
            self.cache[key] = value
            self.access_order.append(key)
    
    def clear(self) -> None:
        """清空缓存"""
        with self.lock:
            self.cache.clear()
            self.access_order.clear()


class DiskCache:
    """磁盘缓存层"""
    
    def __init__(self, cache_dir: str):
        self.cache_dir = Path(cache_dir)
        self.cache_dir.mkdir(parents=True, exist_ok=True)
    
    def get(self, key: str) -> Optional[Any]:
        """获取缓存项"""
        cache_file = self.cache_dir / f"{key}.cache"
        if cache_file.exists():
            try:
                with open(cache_file, 'rb') as f:
                    return pickle.load(f)
            except Exception as e:
                logger.warning(f"读取磁盘缓存失败 {key}: {e}")
        return None
    
    def put(self, key: str, value: Any) -> None:
        """添加缓存项"""
        cache_file = self.cache_dir / f"{key}.cache"
        try:
            with open(cache_file, 'wb') as f:
                pickle.dump(value, f)
        except Exception as e:
            logger.warning(f"写入磁盘缓存失败 {key}: {e}")


class TrieSerializer:
    """Trie序列化器"""

    @staticmethod
    def serialize(trie, file_path: str) -> bool:
        """序列化Trie到文件，使用临时文件确保原子性"""
        import tempfile
        import shutil

        try:
            # 处理不同类型的Trie
            if hasattr(trie, 'trie'):  # CaseInsensitiveTrie
                compact_trie = trie.trie
                original_case_map = trie.original_case_map
            else:  # CompactTrie
                compact_trie = trie
                original_case_map = {}

            data = {
                'version': '1.0',
                'word_count': len(compact_trie.data_store),
                'nodes': [],
                'data_store': compact_trie.data_store,
                'original_case_map': original_case_map
            }

            # 序列化节点
            TrieSerializer._serialize_node(compact_trie.root, data['nodes'])

            # 创建临时文件
            temp_file = file_path + '.tmp'
            try:
                # 先写入临时文件
                with gzip.open(temp_file, 'wb') as f:
                    pickle.dump(data, f)

                # 原子性移动到目标位置
                shutil.move(temp_file, file_path)

                logger.info(f"Trie序列化成功: {file_path}")
                return True
            except Exception as e:
                # 清理临时文件
                if os.path.exists(temp_file):
                    os.remove(temp_file)
                raise e
        except Exception as e:
            logger.error(f"Trie序列化失败: {e}")
            return False
    
    @staticmethod
    def _serialize_node(node: CompactTrieNode, nodes_list: List[Dict]) -> int:
        """递归序列化节点"""
        node_data = {
            'is_word_end': node.is_word_end,
            'word_data_id': node.word_data_id,
            'children': []
        }
        
        for i, child in enumerate(node.children):
            if child:
                char = chr(i + ord('a'))
                child_id = TrieSerializer._serialize_node(child, nodes_list)
                node_data['children'].append((char, child_id))
        
        node_id = len(nodes_list)
        nodes_list.append(node_data)
        return node_id
    
    @staticmethod
    def deserialize(file_path: str) -> Optional['CaseInsensitiveTrie']:
        """从文件反序列化Trie"""
        try:
            with gzip.open(file_path, 'rb') as f:
                data = pickle.load(f)
            
            # 创建CompactTrie
            compact_trie = CompactTrie()
            compact_trie.data_store = data['data_store']
            # 根节点是序列化列表的最后一个元素（后序遍历）
            root_id = len(data['nodes']) - 1
            compact_trie.root = TrieSerializer._deserialize_node(data['nodes'], root_id)
            compact_trie.word_count = data.get('word_count', len(compact_trie.data_store))
            
            # 创建CaseInsensitiveTrie
            case_insensitive_trie = CaseInsensitiveTrie()
            case_insensitive_trie.trie = compact_trie
            case_insensitive_trie.original_case_map = data.get('original_case_map', {})
            
            logger.info(f"Trie反序列化成功: {file_path}")
            return case_insensitive_trie
        except Exception as e:
            logger.error(f"Trie反序列化失败: {e}")
            return None
    
    @staticmethod
    def _deserialize_node(nodes_list: List[Dict], node_id: int) -> CompactTrieNode:
        """递归反序列化节点"""
        node_data = nodes_list[node_id]
        node = CompactTrieNode()
        node.is_word_end = node_data['is_word_end']
        node.word_data_id = node_data['word_data_id']
        
        for char, child_id in node_data['children']:
            index = ord(char) - ord('a')
            node.children[index] = TrieSerializer._deserialize_node(nodes_list, child_id)
        
        return node


class CompactTrie:
    """紧凑型Trie实现"""
    
    def __init__(self):
        self.root = CompactTrieNode()
        self.data_store = {}  # word_data_id -> WordData
        self.word_count = 0
    
    def insert(self, word: str, word_data: WordData) -> int:
        """插入单词"""
        node = self.root
        word_lower = word.lower()
        
        for char in word_lower:
            if char.isalpha():
                index = ord(char) - ord('a')
                if 0 <= index < 26:
                    if not node.children[index]:
                        node.children[index] = CompactTrieNode()
                    node = node.children[index]
        
        # 标记单词结束
        if not node.is_word_end:
            node.is_word_end = True
            word_data_id = len(self.data_store)
            node.word_data_id = word_data_id
            self.data_store[word_data_id] = word_data
            self.word_count += 1
            return word_data_id
        else:
            # 单词已存在，更新数据
            self.data_store[node.word_data_id] = word_data
            return node.word_data_id
    
    def exact_match(self, word: str) -> Optional[WordData]:
        """精确匹配"""
        node = self.root
        word_lower = word.lower()
        
        for char in word_lower:
            if char.isalpha():
                index = ord(char) - ord('a')
                if 0 <= index < 26 and node.children[index]:
                    node = node.children[index]
                else:
                    return None
        
        if node.is_word_end and node.word_data_id >= 0:
            return self.data_store[node.word_data_id]
        return None
    
    def prefix_match(self, prefix: str, limit: int = 20) -> List[WordData]:
        """前缀匹配"""
        node = self.root
        prefix_lower = prefix.lower()
        
        # 遍历前缀
        for char in prefix_lower:
            if char.isalpha():
                index = ord(char) - ord('a')
                if 0 <= index < 26 and node.children[index]:
                    node = node.children[index]
                else:
                    return []
        
        # 收集所有匹配的单词
        results = []
        self._collect_words(node, prefix_lower, results, limit)
        return results
    
    def _collect_words(self, node: CompactTrieNode, current_prefix: str,
                      results: List[WordData], limit: int) -> None:
        """递归收集所有匹配的单词"""
        if len(results) >= limit:
            return
        
        if node.is_word_end and node.word_data_id >= 0:
            word_data = self.data_store[node.word_data_id]
            # 确保word字段被正确设置
            if not word_data.word:
                word_data.word = current_prefix
            results.append(word_data)
        
        for i, child in enumerate(node.children):
            if child:
                char = chr(i + ord('a'))
                self._collect_words(child, current_prefix + char, results, limit)
    
    def autocomplete(self, partial_word: str, limit: int = 10) -> List[WordData]:
        """自动补全"""
        matches = self.prefix_match(partial_word, limit * 2)  # 获取更多候选
        
        # 按词频和字母顺序排序
        matches.sort(key=lambda x: (-x.frequency, x.word.lower()))
        
        return matches[:limit]


class CaseInsensitiveTrie:
    """大小写不敏感的Trie"""
    
    def __init__(self):
        self.trie = CompactTrie()
        self.original_case_map = {}  # 保存原始大小写映射
    
    def insert(self, word: str, word_data: WordData) -> int:
        """插入单词，保存原始大小写"""
        lower_word = word.lower()
        word_id = self.trie.insert(lower_word, word_data)
        self.original_case_map[lower_word] = word
        return word_id
    
    def search(self, word: str) -> Optional[WordData]:
        """搜索单词，返回原始大小写形式"""
        lower_word = word.lower()
        result = self.trie.exact_match(lower_word)
        if result:
            result.word = self.original_case_map.get(lower_word, lower_word)
        return result
    
    def search_words(self, pattern: str, limit: int = 20) -> List[str]:
        """搜索单词列表"""
        results = self.trie.prefix_match(pattern, limit)
        return [self.original_case_map.get(result.word.lower(), result.word) for result in results]
    
    def autocomplete(self, partial_word: str, limit: int = 10) -> List[WordData]:
        """自动补全"""
        results = self.trie.autocomplete(partial_word, limit)
        for result in results:
            result.word = self.original_case_map.get(result.word.lower(), result.word)
        return results


class TrieDictionary:
    """Trie词典实现，兼容现有API"""
    
    def __init__(self, cache_dir: str = None):
        self.cache_dir = cache_dir or os.path.join(os.path.dirname(__file__), '..', '..', 'cache', 'trie')
        self.memory_cache = MemoryCache(max_size=1000)
        self.disk_cache = DiskCache(self.cache_dir)
        self.trie = CaseInsensitiveTrie()
        self._is_loaded = False
        self._header_info = {
            'BookTitle': 'Trie Dictionary',
            'WordCount': 0
        }
        self._lock = threading.RLock()
    
    def load_dictionary(self, stardict_path: str = None) -> bool:
        """加载词典"""
        with self._lock:
            if self._is_loaded:
                return True
            
            # 尝试从缓存加载
            cache_file = os.path.join(self.cache_dir, 'trie_cache.gz')
            if os.path.exists(cache_file):
                try:
                    cached_trie = TrieSerializer.deserialize(cache_file)
                    if cached_trie:
                        self.trie = cached_trie
                        self._is_loaded = True
                        self._header_info['WordCount'] = self.trie.trie.word_count
                        logger.info(f"Trie词典从缓存加载成功，共{self.trie.trie.word_count:,}个词条")
                        return True
                except Exception as e:
                    logger.warning(f"从缓存加载Trie词典失败: {e}")
            
            # 从StarDict数据库构建
            if stardict_path:
                try:
                    from .trie_builder import TrieBuilder
                    builder = TrieBuilder()
                    success = builder.build_from_stardict(stardict_path, self.trie)
                    
                    if success:
                        # 保存到缓存
                        TrieSerializer.serialize(self.trie, cache_file)
                        self._is_loaded = True
                        self._header_info['WordCount'] = self.trie.trie.word_count
                        logger.info(f"Trie词典构建成功，共{self.trie.trie.word_count:,}个词条")
                        return True
                except Exception as e:
                    logger.error(f"从StarDict构建Trie词典失败: {e}")
            
            return False
    
    def lookup_word(self, word: str) -> Optional[Dict]:
        """查询单词，保持与现有接口兼容"""
        if not self._is_loaded:
            return None
        
        # 检查内存缓存
        cache_key = f"lookup:{word.lower()}"
        cached_result = self.memory_cache.get(cache_key)
        if cached_result:
            return cached_result
        
        try:
            start_time = time.time()
            result = self.trie.search(word)
            query_time = time.time() - start_time
            
            if result:
                response = {
                    'word': result.word,
                    'pronunciation': result.pronunciation,
                    'definition': result.definition,
                    'translation': result.translation,
                    'examples': result.examples,
                    'pos': result.pos,
                    'is_fuzzy_match': False,
                    'source': self._header_info['BookTitle']
                }
                
                # 缓存结果
                self.memory_cache.put(cache_key, response)
                
                logger.debug(f"查询单词 '{word}' 成功，耗时 {query_time:.4f}s")
                return response
            else:
                # 尝试前缀匹配
                suggestions = self.trie.search_words(word, 5)
                if suggestions:
                    response = {
                        'word': word,
                        'suggestions': suggestions,
                        'is_fuzzy_match': True,
                        'source': self._header_info['BookTitle']
                    }
                    self.memory_cache.put(cache_key, response)
                    return response
            
            return None
            
        except Exception as e:
            logger.error(f"查询单词失败 '{word}': {e}")
            return None
    
    def search_words(self, pattern: str, limit: int = 20) -> List[str]:
        """搜索单词，保持与现有接口兼容"""
        if not self._is_loaded:
            return []
        
        # 检查内存缓存
        cache_key = f"search:{pattern}:{limit}"
        cached_result = self.memory_cache.get(cache_key)
        if cached_result:
            return cached_result
        
        try:
            start_time = time.time()
            results = self.trie.search_words(pattern, limit)
            query_time = time.time() - start_time
            
            # 缓存结果
            self.memory_cache.put(cache_key, results)
            
            logger.debug(f"搜索单词 '{pattern}' 返回 {len(results)} 个结果，耗时 {query_time:.4f}s")
            return results
            
        except Exception as e:
            logger.error(f"搜索单词失败: {e}")
            return []
    
    def get_word_count(self) -> int:
        """获取词典单词总数"""
        return self._header_info.get('WordCount', 0)
    
    def get_info(self) -> Dict:
        """获取词典信息"""
        info = self._header_info.copy()
        info['file_path'] = 'Trie Cache'
        info['is_loaded'] = self._is_loaded
        info['cache_dir'] = self.cache_dir
        return info
    
    def clear_cache(self) -> None:
        """清空缓存"""
        self.memory_cache.clear()
        logger.info("Trie词典内存缓存已清空")
    
    def close(self) -> None:
        """关闭词典"""
        self.clear_cache()
        self._is_loaded = False
    
    def __enter__(self):
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        self.close()
