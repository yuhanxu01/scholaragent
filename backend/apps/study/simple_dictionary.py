import json
import sqlite3
from typing import Dict, List, Optional
import logging

logger = logging.getLogger(__name__)

class SimpleDictionary:
    """
    简单词典实现，作为Trie和StarDict的后备方案
    现在只包含少量核心词汇，主要用于系统启动时的基本查询
    """

    def __init__(self, dictionary_data_path: str = None):
        """
        初始化简单词典

        Args:
            dictionary_data_path: 词典数据文件路径（已弃用）
        """
        self._db_connection = None
        self._is_loaded = False
        self._header_info = {
            'BookTitle': '简单后备词典',
            'Author': 'Backup Dictionary',
            'Description': '用于系统启动时的基本查询，仅包含少量核心词汇'
        }

        # 核心词汇数据（大幅缩减，仅保留最基本的词汇）
        self._built_in_dict = {
            'hello': {
                'definition': 'interjection. 喂；你好',
                'pronunciation': 'həˈləu',
                'translation': '喂；你好',
                'examples': ['Hello, how are you?']
            },
            'world': {
                'definition': 'n. 世界；领域；宇宙',
                'pronunciation': 'wɜːld',
                'translation': '世界；地球；全世界',
                'examples': ['The world is getting smaller.']
            },
            'computer': {
                'definition': 'n. 计算机；电脑；电子计算机',
                'pronunciation': 'kəmˈpjuːtər',
                'translation': '计算机；电脑',
                'examples': ['I use my computer for work.']
            },
            'dictionary': {
                'definition': 'n. 词典；字典；辞书',
                'pronunciation': 'ˈdɪkʃəneri',
                'translation': '词典；字典',
                'examples': ['Look it up in the dictionary.']
            },
            'study': {
                'definition': 'v. 学习；研究；攻读',
                'pronunciation': 'ˈstʌdi',
                'translation': '学习；研究',
                'examples': ['I study English every day.']
            },
            'book': {
                'definition': 'n. 书籍；著作；卷册',
                'pronunciation': 'bʊk',
                'translation': '书；书籍',
                'examples': ['I am reading a good book.']
            },
            'learn': {
                'definition': 'v. 学习；学会；认识到',
                'pronunciation': 'lɜːn',
                'translation': '学习；学会',
                'examples': ['Children learn quickly.']
            },
            'language': {
                'definition': 'n. 语言；语言文字',
                'pronunciation': 'ˈlæŋɡwɪdʒ',
                'translation': '语言',
                'examples': ['English is a global language.']
            },
            'knowledge': {
                'definition': 'n. 知识；学问；了解',
                'pronunciation': 'ˈnɒlɪdʒ',
                'translation': '知识；学问',
                'examples': ['Knowledge is power.']
            },
            'academic': {
                'definition': 'adj. 学术的；学院的；理论的',
                'pronunciation': 'ˌækəˈdemɪk',
                'translation': '学术的；学院的',
                'examples': ['He has excellent academic performance.']
            }
        }

    def load_dictionary(self) -> bool:
        """
        加载词典数据

        Returns:
            bool: 加载是否成功
        """
        try:
            # 创建内存数据库
            self._db_connection = sqlite3.connect(':memory:')
            cursor = self._db_connection.cursor()

            # 创建索引表
            cursor.execute('''
                CREATE TABLE word_index (
                    word TEXT PRIMARY KEY,
                    definition TEXT,
                    pronunciation TEXT,
                    translation TEXT,
                    examples TEXT
                )
            ''')

            # 插入内置词典数据
            for word, data in self._built_in_dict.items():
                examples_json = json.dumps(data.get('examples', []))
                cursor.execute(
                    'INSERT OR REPLACE INTO word_index VALUES (?, ?, ?, ?, ?)',
                    (
                        word.lower(),
                        data.get('definition', ''),
                        data.get('pronunciation', ''),
                        data.get('translation', ''),
                        examples_json
                    )
                )

            self._db_connection.commit()
            self._is_loaded = True

            logger.info(f"简单后备词典加载成功，共{len(self._built_in_dict)}个词条")
            return True

        except Exception as e:
            logger.error(f"加载简单后备词典失败: {e}")
            return False

    def lookup_word(self, word: str) -> Optional[Dict]:
        """
        查询单词

        Args:
            word: 要查询的单词

        Returns:
            Dict: 包含释义、音标等信息的字典，如果未找到返回None
        """
        if not self._is_loaded:
            if not self.load_dictionary():
                return None

        try:
            word_lower = word.lower().strip()
            cursor = self._db_connection.cursor()

            # 查询索引
            cursor.execute(
                'SELECT definition, pronunciation, translation, examples FROM word_index WHERE word = ?',
                (word_lower,)
            )
            result = cursor.fetchone()

            if result:
                definition, pronunciation, translation, examples_json = result
                examples = json.loads(examples_json) if examples_json else []

                return {
                    'word': word,
                    'definition': definition,
                    'pronunciation': pronunciation,
                    'translation': translation,
                    'examples': examples,
                    'is_fuzzy_match': False,
                    'source': self._header_info['BookTitle']
                }
            else:
                # 尝试模糊匹配
                return self._fuzzy_lookup(word_lower)

        except Exception as e:
            logger.error(f"查询单词失败 '{word}': {e}")
            return None

    def _fuzzy_lookup(self, word: str) -> Optional[Dict]:
        """模糊查词"""
        try:
            cursor = self._db_connection.cursor()

            # 尝试前缀匹配
            cursor.execute(
                'SELECT word, definition, pronunciation, translation, examples FROM word_index WHERE word LIKE ? ORDER BY word LIMIT 3',
                (f'{word}%',)
            )
            results = cursor.fetchall()

            if results:
                # 返回最接近的匹配
                closest_word, definition, pronunciation, translation, examples_json = results[0]
                examples = json.loads(examples_json) if examples_json else []

                suggestions = [result[0] for result in results[1:]]

                return {
                    'word': closest_word,
                    'definition': definition,
                    'pronunciation': pronunciation,
                    'translation': translation,
                    'examples': examples,
                    'suggestions': suggestions,
                    'is_fuzzy_match': True,
                    'source': self._header_info['BookTitle']
                }

            return None

        except Exception as e:
            logger.error(f"模糊查询失败: {e}")
            return None

    def search_words(self, pattern: str, limit: int = 20) -> List[str]:
        """
        搜索单词

        Args:
            pattern: 搜索模式
            limit: 结果数量限制

        Returns:
            List[str]: 匹配的单词列表
        """
        if not self._is_loaded:
            if not self.load_dictionary():
                return []

        try:
            cursor = self._db_connection.cursor()
            # 使用前缀匹配，更有针对性
            pattern_lower = pattern.lower()
            cursor.execute(
                'SELECT word FROM word_index WHERE word LIKE ? ORDER BY word LIMIT ?',
                (f'{pattern_lower}%', limit)
            )
            results = cursor.fetchall()
            return [result[0] for result in results]

        except Exception as e:
            logger.error(f"搜索单词失败: {e}")
            return []

    def get_word_count(self) -> int:
        """获取词典单词总数"""
        if not self._is_loaded:
            return 0

        try:
            cursor = self._db_connection.cursor()
            cursor.execute('SELECT COUNT(*) FROM word_index')
            return cursor.fetchone()[0]
        except:
            return 0

    def get_info(self) -> Dict:
        """获取词典信息"""
        info = self._header_info.copy()
        info['word_count'] = self.get_word_count()
        info['file_path'] = 'built-in'
        info['is_loaded'] = self._is_loaded
        return info

    def close(self):
        """关闭词典连接"""
        if self._db_connection:
            self._db_connection.close()
            self._db_connection = None

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.close()