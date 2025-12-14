import re
import math
from typing import List, Tuple
from django.db.models import Q


def normalize_text(text: str) -> str:
    """规范化文本内容"""
    if not text:
        return ""

    # 移除多余的空白字符
    text = re.sub(r'\s+', ' ', text)

    # 移除特殊字符（保留中英文、数字、基本标点）
    text = re.sub(r'[^\w\s\u4e00-\u9fff.,!?;:()[\]{}"]', ' ', text)

    return text.strip()


def calculate_relevance_score(query: str, content: str, title: str = None) -> float:
    """计算相关性评分"""
    if not query or not content:
        return 0.0

    query_lower = query.lower()
    content_lower = content.lower()
    title_lower = title.lower() if title else ""

    # 基础分数
    score = 0.0

    # 标题匹配（权重更高）
    if title and query_lower in title_lower:
        score += 0.4
        # 精确匹配标题
        if query_lower == title_lower:
            score += 0.3

    # 内容匹配
    content_matches = content_lower.count(query_lower)
    if content_matches > 0:
        # 使用对数函数避免过度奖励高频词
        score += min(0.5, 0.2 * math.log(content_matches + 1))

    # 长度惩罚（过短的内容分数降低）
    if len(content) < 50:
        score *= 0.7
    elif len(content) > 1000:
        score *= 0.9

    return min(1.0, score)


def extract_snippet(content: str, query: str, max_length: int = 200) -> str:
    """提取包含查询词的内容片段"""
    if not query or not content:
        return content[:max_length] + "..." if len(content) > max_length else content

    query_lower = query.lower()
    content_lower = content.lower()

    # 查找第一个匹配位置
    pos = content_lower.find(query_lower)
    if pos == -1:
        return content[:max_length] + "..." if len(content) > max_length else content

    # 计算片段的起始和结束位置
    start = max(0, pos - max_length // 2)
    end = min(len(content), pos + len(query) + max_length // 2)

    snippet = content[start:end]

    # 添加省略号
    if start > 0:
        snippet = "..." + snippet
    if end < len(content):
        snippet = snippet + "..."

    return snippet


def tokenize_query(query: str) -> List[str]:
    """分词处理"""
    # 按空格和标点符号分割
    tokens = re.findall(r'[\w\u4e00-\u9fff]+', query)

    # 过滤停用词
    stop_words = {
        'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
        'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did',
        'will', 'would', 'could', 'should', 'may', 'might', 'must', 'can', 'this', 'that', 'these',
        'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'what', 'which', 'who', 'when',
        'where', 'why', 'how', 'all', 'any', 'both', 'each', 'few', 'more', 'most', 'other',
        'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very',
        # 中文停用词
        '的', '了', '在', '是', '我', '有', '和', '就', '不', '人', '都', '一', '一个', '上', '也',
        '很', '到', '说', '要', '去', '你', '会', '着', '没有', '看', '好', '自己', '这', '那'
    }

    # 过滤并返回结果
    return [token.lower() for token in tokens if len(token) > 1 and token.lower() not in stop_words]


def build_search_query(tokens: List[str]) -> Q:
    """构建搜索查询对象"""
    if not tokens:
        return Q()

    query = Q()

    for token in tokens:
        # 为每个token构建查询条件
        query |= (
            Q(name__icontains=token) |
            Q(description__icontains=token) |
            Q(title__icontains=token) |
            Q(content__icontains=token)
        )

    return query


def calculate_text_similarity(text1: str, text2: str) -> float:
    """计算文本相似度（简化版Jaccard相似度）"""
    if not text1 or not text2:
        return 0.0

    # 分词
    words1 = set(tokenize_query(text1))
    words2 = set(tokenize_query(text2))

    if not words1 or not words2:
        return 0.0

    # 计算Jaccard相似度
    intersection = len(words1.intersection(words2))
    union = len(words1.union(words2))

    return intersection / union if union > 0 else 0.0


def format_file_size(size_bytes: int) -> str:
    """格式化文件大小"""
    if size_bytes == 0:
        return "0 B"

    size_names = ["B", "KB", "MB", "GB"]
    i = 0
    while size_bytes >= 1024 and i < len(size_names) - 1:
        size_bytes /= 1024.0
        i += 1

    return f"{size_bytes:.1f} {size_names[i]}"


def truncate_text(text: str, max_length: int = 100, suffix: str = "...") -> str:
    """截断文本"""
    if len(text) <= max_length:
        return text

    return text[:max_length - len(suffix)] + suffix