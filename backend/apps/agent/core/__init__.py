"""
Agent Core Module

包含Agent执行引擎的核心组件：
- prompts.py: 提示词模板
- memory.py: 记忆管理
- executor.py: Agent执行器
"""

from .executor import ScholarAgent
from .memory import MemoryManager
from .prompts import SYSTEM_PROMPT, PLANNER_PROMPT, REACT_PROMPT

__all__ = [
    'ScholarAgent',
    'MemoryManager',
    'SYSTEM_PROMPT',
    'PLANNER_PROMPT',
    'REACT_PROMPT',
]