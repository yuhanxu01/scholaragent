"""
Agent 工具系统 / Agent Tool System

支持中英文的 AI Agent 工具集合，用于执行各种任务
AI Agent tool collection with Chinese and English support
"""

# Import all tools to ensure they are registered
from .base import BaseTool, ToolResult
from .registry import ToolRegistry

# Import search tools
from .search_tools import (
    SearchConceptsTool,
    SearchContentTool,
    GetSectionTool,
    GetDocumentSummaryTool
)

# Import analysis tools
from .analysis_tools import (
    AnalyzeFormulaTool,
    CompareConceptsTool,
    GenerateExplanationTool
)

# Import knowledge tools
from .knowledge_tools import (
    CreateNoteTool,
    CreateFlashcardTool,
    AskClarificationTool
)

__all__ = [
    'BaseTool',
    'ToolResult',
    'ToolRegistry',
    # Search tools / 搜索工具
    'SearchConceptsTool',
    'SearchContentTool',
    'GetSectionTool',
    'GetDocumentSummaryTool',
    # Analysis tools / 分析工具
    'AnalyzeFormulaTool',
    'CompareConceptsTool',
    'GenerateExplanationTool',
    # Knowledge tools / 知识工具
    'CreateNoteTool',
    'CreateFlashcardTool',
    'AskClarificationTool',
]