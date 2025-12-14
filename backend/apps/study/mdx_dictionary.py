import re
import sqlite3
import struct
import zlib
from typing import Dict, List, Optional, Tuple
from pathlib import Path
import logging

logger = logging.getLogger(__name__)


class MDXDictionary:
    """MDX词典解析器"""

    def __init__(self, mdx_file_path: str):
        """
        初始化MDX词典解析器

        Args:
            mdx_file_path: MDX文件路径
        """
        self.mdx_file_path = Path(mdx_file_path)
        self._header_info = {}
        self._key_index = {}
        self._record_index = {}
        self._db_connection = None
        self._is_loaded = False

    def load_dictionary(self) -> bool:
        """
        加载MDX词典

        Returns:
            bool: 加载是否成功
        """
        try:
            if not self.mdx_file_path.exists():
                logger.error(f"MDX文件不存在: {self.mdx_file_path}")
                return False

            # 解析MDX文件头
            if not self._parse_header():
                return False

            # 构建索引
            if not self._build_index():
                return False

            self._is_loaded = True
            logger.info(f"MDX词典加载成功: {self.mdx_file_path}")
            return True

        except Exception as e:
            logger.error(f"加载MDX词典失败: {e}")
            return False

    def _parse_header(self) -> bool:
        """解析MDX文件头"""
        try:
            with open(self.mdx_file_path, 'rb') as f:
                # 读取文件前几个字节来确定格式
                header_data = f.read(1024)

                # 尝试检测不同的MDX格式
                if self._is_standard_mdx(header_data):
                    return self._parse_standard_mdx(f)
                elif self._is_unicode_mdx(header_data):
                    return self._parse_unicode_mdx(f)
                else:
                    # 如果无法识别格式，创建一个基本的基于文本的词典
                    logger.warning("无法识别MDX格式，尝试文本模式解析")
                    return self._parse_text_mode()

        except Exception as e:
            logger.error(f"解析MDX文件头失败: {e}")
            return False

    def _is_standard_mdx(self, header_data: bytes) -> bool:
        """检测是否为标准MDX格式"""
        return header_data.startswith(b'\xcd\x76\x32\x31')

    def _is_unicode_mdx(self, header_data: bytes) -> bool:
        """检测是否为Unicode MDX格式"""
        # 检查是否包含Unicode文本
        try:
            text = header_data.decode('utf-16-le', errors='ignore')
            return 'Dictionary' in text or 'GeneratedByEngineVersion' in text
        except:
            return False

    def _parse_standard_mdx(self, f) -> bool:
        """解析标准MDX格式"""
        try:
            f.seek(0)
            header_magic = f.read(4)
            if header_magic != b'\xcd\x76\x32\x31':
                return False

            header_length = struct.unpack('<I', f.read(4))[0]
            header_data = f.read(header_length)
            header_text = header_data.decode('utf-8', errors='ignore')
            self._header_info = self._parse_header_text(header_text)
            return True

        except Exception as e:
            logger.error(f"解析标准MDX失败: {e}")
            return False

    def _parse_unicode_mdx(self, f) -> bool:
        """解析Unicode MDX格式"""
        try:
            f.seek(0)
            # 读取文件大小
            f.seek(0, 2)
            file_size = f.tell()
            f.seek(0)

            # 读取全部数据并尝试UTF-16解码
            all_data = f.read()
            unicode_text = all_data.decode('utf-16-le', errors='ignore')

            # 解析头部信息
            self._header_info = self._parse_header_text(unicode_text)

            # 为Unicode模式创建一个简单的单词列表
            self._create_simple_word_index(unicode_text)

            return True

        except Exception as e:
            logger.error(f"解析Unicode MDX失败: {e}")
            return False

    def _parse_text_mode(self) -> bool:
        """文本模式解析 - 处理简单的文本格式"""
        try:
            with open(self.mdx_file_path, 'r', encoding='utf-8', errors='ignore') as f:
                content = f.read()

            # 创建基本的单词索引
            self._create_simple_word_index(content)
            self._header_info = {'BookTitle': 'Text Dictionary'}

            return True

        except Exception as e:
            logger.error(f"文本模式解析失败: {e}")
            return False

    def _create_simple_word_index(self, content: str):
        """创建简单的单词索引"""
        import re

        # 创建内存数据库
        self._db_connection = sqlite3.connect(':memory:')
        cursor = self._db_connection.cursor()

        cursor.execute('''
            CREATE TABLE word_index (
                word TEXT PRIMARY KEY,
                record_offset INTEGER,
                record_size INTEGER,
                definition TEXT
            )
        ''')

        # 使用正则表达式查找单词和释义
        # 匹配模式：单词 后面跟着释义
        word_pattern = r'([a-zA-Z]+)[\s\[]*([^\[]*?)(?:\[|$|)'
        matches = re.findall(word_pattern, content, re.MULTILINE)

        added_words = set()
        offset = 0

        for word, definition in matches:
            word = word.strip().lower()
            if len(word) < 2 or word in added_words:
                continue

            definition = definition.strip()
            if not definition:
                definition = f"Definition for {word}"

            try:
                cursor.execute(
                    'INSERT OR REPLACE INTO word_index VALUES (?, ?, ?, ?)',
                    (word, offset, len(definition), definition)
                )
                added_words.add(word)
                offset += 100  # 模拟偏移量
            except sqlite3.IntegrityError:
                continue

        self._db_connection.commit()
        logger.info(f"简单索引创建完成，共{len(added_words)}个词条")

    def _parse_header_text(self, header_text: str) -> Dict:
        """解析头部文本信息"""
        header_info = {}

        # 提取基本信息
        patterns = {
            'BookTitle': r'<BookTitle>(.*?)</BookTitle>',
            'Author': r'<Author>(.*?)</Author>',
            'Description': r'<Description>(.*?)</Description>',
            'WordCount': r'<WordCount>(\d+)</WordCount>',
        }

        for key, pattern in patterns.items():
            match = re.search(pattern, header_text, re.DOTALL)
            if match:
                header_info[key] = match.group(1).strip()

        return header_info

    def _build_index(self) -> bool:
        """构建词典索引"""
        try:
            # 如果数据库连接已存在（Unicode模式下已创建），跳过索引构建
            if self._db_connection:
                logger.info("数据库索引已存在，跳过构建")
                return True

            # 创建内存数据库缓存索引
            self._db_connection = sqlite3.connect(':memory:')
            cursor = self._db_connection.cursor()

            # 创建索引表
            cursor.execute('''
                CREATE TABLE word_index (
                    word TEXT PRIMARY KEY,
                    record_offset INTEGER,
                    record_size INTEGER
                )
            ''')

            # 读取并解析索引数据
            with open(self.mdx_file_path, 'rb') as f:
                # 跳过头部，读取索引部分
                f.seek(self._get_index_offset())

                # 简化的索引解析（实际MDX格式更复杂）
                while True:
                    # 读取键长度
                    key_length_data = f.read(2)
                    if len(key_length_data) < 2:
                        break

                    key_length = struct.unpack('<H', key_length_data)[0]
                    if key_length == 0:
                        break

                    # 读取键
                    key_data = f.read(key_length)
                    if len(key_data) < key_length:
                        break

                    word = key_data.decode('utf-8', errors='ignore').lower()

                    # 读取记录信息
                    record_info = struct.unpack('<II', f.read(8))
                    record_offset, record_size = record_info

                    # 存储到索引数据库
                    cursor.execute(
                        'INSERT OR REPLACE INTO word_index VALUES (?, ?, ?)',
                        (word, record_offset, record_size)
                    )

            self._db_connection.commit()
            count = cursor.execute('SELECT COUNT(*) FROM word_index').fetchone()[0]
            logger.info(f"索引构建完成，共{count}个词条")
            return True

        except Exception as e:
            logger.error(f"构建索引失败: {e}")
            return False

    def _get_index_offset(self) -> int:
        """获取索引数据偏移量"""
        # 简化实现，实际MDX格式需要更复杂的计算
        return 1024  # 假设索引从1KB开始

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
                'SELECT record_offset, record_size FROM word_index WHERE word = ?',
                (word_lower,)
            )
            result = cursor.fetchone()

            if not result:
                # 尝试模糊匹配
                return self._fuzzy_lookup(word_lower)

            record_offset, record_size = result
            return self._read_record(record_offset, record_size)

        except Exception as e:
            logger.error(f"查询单词失败 '{word}': {e}")
            return None

    def _fuzzy_lookup(self, word: str) -> Optional[Dict]:
        """模糊查词"""
        try:
            cursor = self._db_connection.cursor()

            # 尝试前缀匹配
            cursor.execute(
                'SELECT word, record_offset, record_size FROM word_index WHERE word LIKE ? ORDER BY word LIMIT 5',
                (f'{word}%',)
            )
            results = cursor.fetchall()

            if results:
                # 返回最接近的匹配
                closest_word, record_offset, record_size = results[0]
                record = self._read_record(record_offset, record_size)
                if record:
                    record['suggestions'] = [r[0] for r in results[1:]]
                    record['is_fuzzy_match'] = True
                return record

            return None

        except Exception as e:
            logger.error(f"模糊查询失败: {e}")
            return None

    def _read_record(self, offset: int, size: int) -> Optional[Dict]:
        """读取词典记录"""
        try:
            # 首先尝试从数据库读取预存的定义
            cursor = self._db_connection.cursor()
            cursor.execute(
                'SELECT definition FROM word_index WHERE word = (SELECT word FROM word_index WHERE record_offset = ? LIMIT 1)',
                (offset,)
            )
            result = cursor.fetchone()

            if result and result[0]:
                return self._parse_record_from_text(result[0])

            # 如果没有预存定义，尝试从文件读取
            with open(self.mdx_file_path, 'rb') as f:
                f.seek(offset)
                record_data = f.read(size)

                if not record_data:
                    return None

                # 解压缩记录数据（如果需要）
                if record_data.startswith(b'\x1f\x8b'):  # gzip标记
                    try:
                        record_data = zlib.decompress(record_data, 15 + 32)
                    except:
                        pass

                # 尝试不同编码解码
                try:
                    record_text = record_data.decode('utf-8', errors='ignore')
                except:
                    record_text = record_data.decode('utf-16-le', errors='ignore')

                return self._parse_record_from_text(record_text)

        except Exception as e:
            logger.error(f"读取记录失败: {e}")
            return None

    def _parse_record_from_text(self, text: str) -> Dict:
        """从文本解析记录"""
        record = {
            'definition': '',
            'pronunciation': '',
            'translation': '',
            'examples': []
        }

        try:
            text = text.strip()
            if not text:
                return record

            # 提取音标
            phonetic_patterns = [
                r'\[([^\]]+)\]',  # [音标]
                r'/([^/]+)/',     # /音标/
                r'Phonetic:\s*([^\s\n]+)',
            ]

            for pattern in phonetic_patterns:
                match = re.search(pattern, text)
                if match:
                    record['pronunciation'] = match.group(1).strip()
                    break

            # 提取例句
            example_patterns = [
                r'[Ee]xamples?:\s*(.*?)(?=\n\n|\n[A-Z]|\Z)',
                r'[Ee]g\.?\s*(.*?)(?=\n[.!?]|\n\n|\Z)',
                r'例句[:：]\s*(.*?)(?=\n\n|\Z)',
            ]

            for pattern in example_patterns:
                matches = re.findall(pattern, text, re.DOTALL | re.IGNORECASE)
                if matches:
                    record['examples'] = [m.strip() for m in matches[:3] if m.strip()]
                    break

            # 提取中文翻译
            chinese_matches = re.findall(r'[\u4e00-\u9fff]+[^\u4e00-\u9fff]*', text)
            if chinese_matches:
                # 过滤掉音标部分
                filtered_chinese = []
                for match in chinese_matches:
                    if not re.match(r'^[\[\]()\/]*$', match):
                        filtered_chinese.append(match.strip())
                if filtered_chinese:
                    record['translation'] = '; '.join(filtered_chinese[:3])

            # 清理文本作为主要释义
            definition = text
            # 移除音标
            definition = re.sub(r'[\[\]\/][^\[\]\/]*[\[\]\/]', '', definition)
            # 移除例句标记
            definition = re.sub(r'[Ee]xamples?:.*', '', definition, flags=re.DOTALL)
            definition = re.sub(r'[Ee]g\.?\s*.*', '', definition, flags=re.DOTALL)
            definition = re.sub(r'例句[:：].*', '', definition, flags=re.DOTALL)
            # 清理多余空白
            definition = re.sub(r'\s+', ' ', definition).strip()

            record['definition'] = definition or "释义未找到"

        except Exception as e:
            logger.error(f"解析记录文本失败: {e}")
            record['definition'] = text if text else "解析失败"

        return record

    def _parse_record(self, record_text: str) -> Dict:
        """解析词典记录内容"""
        record = {
            'definition': '',
            'pronunciation': '',
            'translation': '',
            'examples': []
        }

        try:
            # 简化的HTML解析
            # 提取音标
            phonetic_match = re.search(r'\[(.*?)\]', record_text)
            if phonetic_match:
                record['pronunciation'] = phonetic_match.group(1)

            # 提取例句
            example_matches = re.findall(r'<[^>]*>([^<]*\b[^.!?]*[.!?])</[^>]*>', record_text)
            if example_matches:
                record['examples'] = example_matches[:3]  # 最多3个例句

            # 清理HTML标签作为主要释义
            clean_text = re.sub(r'<[^>]+>', ' ', record_text)
            clean_text = re.sub(r'\s+', ' ', clean_text).strip()

            # 移除音标部分（已在前面提取）
            clean_text = re.sub(r'\[.*?\]', '', clean_text)

            record['definition'] = clean_text

            # 简单的中文翻译提取
            chinese_matches = re.findall(r'[\u4e00-\u9fff]+[^\u4e00-\u9fff]*', record_text)
            if chinese_matches:
                record['translation'] = '; '.join(chinese_matches[:3])  # 最多3个中文释义

        except Exception as e:
            logger.error(f"解析记录失败: {e}")
            record['definition'] = record_text  # 如果解析失败，使用原始文本

        return record

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
            cursor.execute(
                'SELECT word FROM word_index WHERE word LIKE ? ORDER BY word LIMIT ?',
                (f'%{pattern}%', limit)
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
        info['file_path'] = str(self.mdx_file_path)
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