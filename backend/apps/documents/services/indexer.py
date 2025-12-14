"""
文档索引生成服务：调用LLM生成摘要、概念、关键词等。
"""
import logging
from typing import Dict, Any, Optional
from dataclasses import dataclass, asdict

from core.llm import get_llm_client
from apps.billing.services import TokenUsageService

logger = logging.getLogger(__name__)


# 索引生成提示模板（可配置）
INDEX_GENERATION_PROMPT = """
你是一位学术文档分析专家。请分析以下文档内容，并生成结构化的索引信息。

文档内容：
```
{content}
```

请提供以下信息的JSON对象：
1. "summary": 文档的简明摘要（200-300字）。
2. "concepts": 文档中出现的核心概念列表，每个概念包含：
   - "name": 概念名称
   - "description": 简短解释
   - "importance": 高/中/低
3. "keywords": 关键词列表（最多10个），按重要性排序。
4. "difficulty": 文档的整体难度等级（1-5，1为最简单，5为最难）。
5. "estimated_reading_time": 估计阅读时间（分钟）。
6. "prerequisites": 阅读本文档所需的前置知识列表。
7. "sections_summary": 对每个主要章节的简短描述列表（如果有章节结构）。
8. "formula_summary": 对文档中数学公式的总体描述（如果有）。
9. "recommended_questions": 推荐用于自我测试的问题列表（最多5个）。

请确保输出是有效的JSON，且仅包含JSON对象，不要有其他文本。
"""


@dataclass
class IndexData:
    """索引数据结构"""
    summary: str = ""
    concepts: list = None
    keywords: list = None
    difficulty: int = 3
    estimated_reading_time: int = 0
    prerequisites: list = None
    sections_summary: list = None
    formula_summary: str = ""
    recommended_questions: list = None

    def __post_init__(self):
        if self.concepts is None:
            self.concepts = []
        if self.keywords is None:
            self.keywords = []
        if self.prerequisites is None:
            self.prerequisites = []
        if self.sections_summary is None:
            self.sections_summary = []
        if self.recommended_questions is None:
            self.recommended_questions = []

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


class DocumentIndexer:
    """文档索引生成器"""

    def __init__(self, llm_client=None):
        self.llm_client = llm_client or get_llm_client()

    async def generate_index(self, content: str, model: Optional[str] = None, user=None) -> Dict[str, Any]:
        """
        为文档内容生成索引。

        Args:
            content: 文档内容（清洗后的文本）
            model: 使用的LLM模型（可选）
            user: 用户对象（可选，用于token记录）

        Returns:
            索引字典
        """
        if not content.strip():
            logger.warning("Empty content provided, returning empty index")
            return IndexData().to_dict()

        try:
            # 调用LLM生成JSON
            prompt = INDEX_GENERATION_PROMPT.format(content=content[:8000])  # 限制长度避免token超限
            result = await self.llm_client.generate_json(
                prompt=prompt,
                system_prompt="你是一位严谨的学术助手，请准确分析文档并生成结构化索引。",
                model=model,
                temperature=0.2,
                max_tokens=2500,
            )

            # 记录token使用
            if user and 'usage' in result:
                usage = result['usage']
                input_tokens = usage.get('prompt_tokens', 0)
                output_tokens = usage.get('completion_tokens', 0)
                if input_tokens > 0 or output_tokens > 0:
                    try:
                        await TokenUsageService.record_token_usage(
                            user=user,
                            input_tokens=input_tokens,
                            output_tokens=output_tokens,
                            api_type='document_index',
                            metadata={
                                'content_length': len(content),
                                'model': model or 'default'
                            }
                        )
                    except Exception as e:
                        logger.warning(f"Failed to record token usage for document indexing: {e}")

            # 验证结果字段
            validated = self._validate_index(result)
            logger.info(f"索引生成成功，难度={validated.get('difficulty')}")
            return validated
        except Exception as e:
            logger.error(f"索引生成失败: {e}")
            # 返回默认索引
            return self._default_index(content)

    def _validate_index(self, raw: Dict[str, Any]) -> Dict[str, Any]:
        """验证并补全索引字段"""
        default = IndexData().to_dict()
        validated = default.copy()
        for key in validated.keys():
            if key in raw:
                validated[key] = raw[key]
        # 确保类型正确
        if not isinstance(validated["difficulty"], int):
            try:
                validated["difficulty"] = int(validated["difficulty"])
            except:
                validated["difficulty"] = 3
        if validated["difficulty"] < 1 or validated["difficulty"] > 5:
            validated["difficulty"] = 3
        return validated

    def _default_index(self, content: str) -> Dict[str, Any]:
        """生成默认索引（当LLM失败时）"""
        from .parser import MarkdownParser  # 避免循环导入
        try:
            parser = MarkdownParser()
            parsed = parser.parse(content)
            # 基于解析结果生成简单索引
            word_count = len(content.split())
            reading_time = max(1, word_count // 200)  # 假设每分钟200词
            concepts = []
            for tag in parsed.tags[:5]:
                concepts.append({
                    "name": tag,
                    "description": f"文档中提到的{tag}",
                    "importance": "medium"
                })
            keywords = parsed.tags[:10]
            summary = parsed.metadata.get("abstract", "") or (
                parsed.cleaned_content[:300] + "..."
            )
            return {
                "summary": summary,
                "concepts": concepts,
                "keywords": keywords,
                "difficulty": 3,
                "estimated_reading_time": reading_time,
                "prerequisites": [],
                "sections_summary": [
                    {"title": s["title"], "description": f"第{s['level']}级章节"}
                    for s in parsed.sections[:3]
                ],
                "formula_summary": f"文档包含{len(parsed.formulas)}个数学公式。",
                "recommended_questions": [
                    "本文档的主要论点是什么？",
                    "列举文档中的关键概念。",
                    "文档中的公式表达了什么关系？"
                ]
            }
        except Exception as e:
            logger.warning(f"生成默认索引时出错: {e}")
            return IndexData().to_dict()


# 便捷函数
async def generate_document_index(content: str, user=None, **kwargs) -> Dict[str, Any]:
    """生成文档索引的便捷函数"""
    indexer = DocumentIndexer()
    return await indexer.generate_index(content, user=user, **kwargs)


# 全局实例
document_indexer = DocumentIndexer()