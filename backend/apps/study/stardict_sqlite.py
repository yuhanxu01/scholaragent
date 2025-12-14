import sqlite3
import logging
from typing import Dict, List, Optional

logger = logging.getLogger(__name__)


class StarDictSQLite:
    """StarDict SQLite 词典读取器"""

    def __init__(self, db_path: str):
        """
        初始化 StarDict SQLite 词典

        Args:
            db_path: SQLite 数据库文件路径
        """
        self.db_path = db_path
        self._connection = None
        self._is_loaded = False
        self._header_info = {
            'BookTitle': 'StarDict SQLite Dictionary',
            'WordCount': 0
        }

    def load_dictionary(self) -> bool:
        """
        加载词典

        Returns:
            bool: 加载是否成功
        """
        try:
            self._connection = sqlite3.connect(self.db_path)
            cursor = self._connection.cursor()

            # 检查表是否存在
            cursor.execute(
                "SELECT name FROM sqlite_master WHERE type='table' AND name='stardict'"
            )
            if not cursor.fetchone():
                logger.error("未找到 stardict 表")
                return False

            # 获取词汇总数
            cursor.execute("SELECT COUNT(*) FROM stardict")
            word_count = cursor.fetchone()[0]
            self._header_info['WordCount'] = word_count

            # 创建索引以提高查询性能
            cursor.execute(
                "CREATE INDEX IF NOT EXISTS idx_word ON stardict(word)"
            )
            cursor.execute(
                "CREATE INDEX IF NOT EXISTS idx_word_lower ON stardict(word)"
            )

            self._connection.commit()
            self._is_loaded = True

            logger.info(f"StarDict SQLite 词典加载成功，共{word_count:,}个词条")
            return True

        except Exception as e:
            logger.error(f"加载StarDict SQLite词典失败: {e}")
            if self._connection:
                self._connection.close()
                self._connection = None
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
            cursor = self._connection.cursor()

            # 查询单词（不区分大小写）
            # 首先尝试精确匹配（区分大小写）
            cursor.execute(
                """
                SELECT word, phonetic, definition, translation, pos
                FROM stardict
                WHERE word = ?
                LIMIT 1
                """,
                (word,)
            )
            result = cursor.fetchone()

            if not result:
                # 不区分大小写匹配
                cursor.execute(
                    """
                    SELECT word, phonetic, definition, translation, pos
                    FROM stardict
                    WHERE word = ? COLLATE NOCASE
                    LIMIT 1
                    """,
                    (word,)
                )
                result = cursor.fetchone()

            if not result:
                # 尝试前缀匹配（不区分大小写）
                cursor.execute(
                    """
                    SELECT word, phonetic, definition, translation, pos
                    FROM stardict
                    WHERE word LIKE ? COLLATE NOCASE
                    ORDER BY
                        CASE
                            WHEN word = ? THEN 1
                            WHEN word = ? COLLATE NOCASE THEN 2
                            ELSE 3
                        END,
                        word
                    LIMIT 1
                    """,
                    (f"{word}%", word, word)
                )
                result = cursor.fetchone()

            if not result:
                return None

            word, phonetic, definition, translation, pos = result

            # 解析释义（可能包含换行符等）
            if definition:
                # 分割多个定义
                definitions = definition.split('\\n')
                main_def = definitions[0].strip()
                examples = [d for d in definitions[1:] if d.strip()][:2]  # 最多2个例句
            else:
                main_def = ""
                examples = []

            return {
                'word': word,
                'pronunciation': phonetic or '',
                'definition': main_def,
                'translation': translation or '',
                'pos': pos or '',
                'examples': examples,
                'is_fuzzy_match': word.lower() != word.lower(),
                'source': self._header_info['BookTitle']
            }

        except Exception as e:
            logger.error(f"查询单词失败 '{word}': {e}")
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
            cursor = self._connection.cursor()

            # 前缀匹配，不区分大小写
            cursor.execute(
                """
                SELECT DISTINCT word
                FROM stardict
                WHERE word LIKE ? COLLATE NOCASE
                ORDER BY
                    CASE
                        WHEN word = ? THEN 1
                        WHEN word = ? COLLATE NOCASE THEN 2
                        ELSE 3
                    END,
                    word
                LIMIT ?
                """,
                (f"{pattern}%", pattern, pattern, limit)
            )

            results = cursor.fetchall()
            return [result[0] for result in results]

        except Exception as e:
            logger.error(f"搜索单词失败: {e}")
            return []

    def get_word_count(self) -> int:
        """获取词典单词总数"""
        return self._header_info.get('WordCount', 0)

    def get_info(self) -> Dict:
        """获取词典信息"""
        info = self._header_info.copy()
        info['file_path'] = self.db_path
        info['is_loaded'] = self._is_loaded
        return info

    def close(self):
        """关闭数据库连接"""
        if self._connection:
            self._connection.close()
            self._connection = None
            self._is_loaded = False

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.close()