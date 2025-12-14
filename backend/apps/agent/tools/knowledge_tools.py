"""
知识工具 / Knowledge Tools

提供笔记创建、复习卡片制作、用户澄清询问等功能
Provides note creation, flashcard generation, user clarification and other knowledge tools
"""

from typing import Dict, Any, List, Optional
from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import timedelta

from ..models import AgentMemory
from apps.knowledge.models import Note, Flashcard
from .base import BaseTool, ToolResult, Language
from .registry import ToolRegistry

User = get_user_model()


@ToolRegistry.register
class CreateNoteTool(BaseTool):
    """创建笔记工具 / Create note tool"""
    name = "create_note"
    category = "knowledge"
    description_zh = "创建学习笔记"
    description_en = "Create study notes"
    async_execution = True

    parameters = {
        "type": "object",
        "properties": {
            "title": {
                "type": "string",
                "description_zh": "笔记标题",
                "description_en": "Note title"
            },
            "content": {
                "type": "string",
                "description_zh": "笔记内容",
                "description_en": "Note content"
            },
            "tags": {
                "type": "array",
                "description_zh": "标签列表（可选）",
                "description_en": "List of tags (optional)",
                "items": {"type": "string"}
            },
            "note_type": {
                "type": "string",
                "enum": ["summary", "question", "insight", "formula", "example"],
                "description_zh": "笔记类型",
                "description_en": "Note type"
            },
            "related_concepts": {
                "type": "array",
                "description_zh": "相关概念ID列表（可选）",
                "description_en": "List of related concept IDs (optional)",
                "items": {"type": "string"}
            }
        },
        "required": ["title", "content"]
    }
    required_parameters = ["title", "content"]

    async def execute(self, title: str, content: str, tags: Optional[List[str]] = None,
                     note_type: str = "summary", related_concepts: Optional[List[str]] = None,
                     user_id: Optional[str] = None, **kwargs) -> ToolResult:
        """创建笔记 / Create note"""
        try:
            if not user_id:
                return ToolResult(
                    success=False,
                    error="User ID is required",
                    message_zh="需要用户ID",
                    message_en="User ID is required"
                )

            # 创建笔记
            note = Note.objects.create(
                user_id=user_id,
                title=title,
                content=content,
                note_type=note_type,
                tags=tags or [],
                related_concepts=related_concepts or []
            )

            # 创建相关记忆（用于智能检索）
            memory = AgentMemory.objects.create(
                user_id=user_id,
                memory_type='knowledge',
                content=f"笔记: {title}\n{content[:200]}...",
                related_concept=title,
                importance=0.7,
                expires_at=timezone.now() + timedelta(days=365)
            )

            return ToolResult(
                success=True,
                data={
                    "note_id": str(note.id),
                    "title": title,
                    "note_type": note_type,
                    "tags": tags or [],
                    "memory_id": str(memory.id),
                    "created_at": note.created_at.isoformat()
                },
                message_zh=f"笔记 '{title}' 创建成功",
                message_en=f"Note '{title}' created successfully"
            )

        except Exception as e:
            return ToolResult(
                success=False,
                error=str(e),
                message_zh=f"创建笔记时出错: {str(e)}",
                message_en=f"Error creating note: {str(e)}"
            )


@ToolRegistry.register
class CreateFlashcardTool(BaseTool):
    """创建复习卡片工具 / Create flashcard tool"""
    name = "create_flashcard"
    category = "knowledge"
    description_zh = "创建复习卡片"
    description_en = "Create review flashcards"
    async_execution = True

    parameters = {
        "type": "object",
        "properties": {
            "question": {
                "type": "string",
                "description_zh": "问题或提示",
                "description_en": "Question or prompt"
            },
            "answer": {
                "type": "string",
                "description_zh": "答案或解释",
                "description_en": "Answer or explanation"
            },
            "difficulty": {
                "type": "integer",
                "minimum": 1,
                "maximum": 5,
                "description_zh": "难度级别（1-5）",
                "description_en": "Difficulty level (1-5)"
            },
            "category": {
                "type": "string",
                "description_zh": "卡片类别（可选）",
                "description_en": "Flashcard category (optional)"
            },
            "tags": {
                "type": "array",
                "description_zh": "标签列表（可选）",
                "description_en": "List of tags (optional)",
                "items": {"type": "string"}
            },
            "hint": {
                "type": "string",
                "description_zh": "提示（可选）",
                "description_en": "Hint (optional)"
            }
        },
        "required": ["question", "answer"]
    }
    required_parameters = ["question", "answer"]

    async def execute(self, question: str, answer: str, difficulty: int = 3,
                     category: Optional[str] = None, tags: Optional[List[str]] = None,
                     hint: Optional[str] = None, user_id: Optional[str] = None,
                     **kwargs) -> ToolResult:
        """创建复习卡片 / Create flashcard"""
        try:
            if not user_id:
                return ToolResult(
                    success=False,
                    error="User ID is required",
                    message_zh="需要用户ID",
                    message_en="User ID is required"
                )

            if not 1 <= difficulty <= 5:
                return ToolResult(
                    success=False,
                    error="Difficulty must be between 1 and 5",
                    message_zh="难度必须在1-5之间",
                    message_en="Difficulty must be between 1 and 5"
                )

            # 创建复习卡片
            flashcard = Flashcard.objects.create(
                user_id=user_id,
                question=question,
                answer=answer,
                difficulty=difficulty,
                category=category,
                tags=tags or [],
                hint=hint
            )

            # 创建相关记忆
            memory = AgentMemory.objects.create(
                user_id=user_id,
                memory_type='knowledge',
                content=f"复习卡片: {question[:100]}...",
                related_concept=category or question[:50],
                importance=0.8,  # 复习卡片重要性较高
                expires_at=timezone.now() + timedelta(days=180)
            )

            # 设置复习间隔（基于难度）
            initial_interval = self._calculate_initial_interval(difficulty)
            flashcard.next_review_at = timezone.now() + timedelta(days=initial_interval)
            flashcard.save()

            return ToolResult(
                success=True,
                data={
                    "flashcard_id": str(flashcard.id),
                    "question": question,
                    "difficulty": difficulty,
                    "category": category,
                    "initial_interval": initial_interval,
                    "next_review": flashcard.next_review_at.isoformat(),
                    "memory_id": str(memory.id)
                },
                message_zh=f"复习卡片创建成功，{initial_interval}天后复习",
                message_en=f"Flashcard created successfully, review in {initial_interval} days"
            )

        except Exception as e:
            return ToolResult(
                success=False,
                error=str(e),
                message_zh=f"创建复习卡片时出错: {str(e)}",
                message_en=f"Error creating flashcard: {str(e)}"
            )

    def _calculate_initial_interval(self, difficulty: int) -> int:
        """根据难度计算初始复习间隔 / Calculate initial review interval based on difficulty"""
        interval_map = {
            1: 1,    # 简单：1天后复习
            2: 3,    # 较简单：3天后复习
            3: 7,    # 中等：7天后复习
            4: 14,   # 较难：14天后复习
            5: 30    # 很难：30天后复习
        }
        return interval_map.get(difficulty, 7)


@ToolRegistry.register
class AskClarificationTool(BaseTool):
    """询问澄清工具 / Ask clarification tool"""
    name = "ask_clarification"
    category = "knowledge"
    description_zh = "向用户询问澄清问题"
    description_en = "Ask user for clarification questions"
    async_execution = True

    parameters = {
        "type": "object",
        "properties": {
            "question": {
                "type": "string",
                "description_zh": "澄清问题",
                "description_en": "Clarification question"
            },
            "options": {
                "type": "array",
                "description_zh": "选项列表（可选）",
                "description_en": "List of options (optional)",
                "items": {"type": "string"}
            },
            "question_type": {
                "type": "string",
                "enum": ["choice", "text", "yes_no", "scale", "multiple_choice"],
                "description_zh": "问题类型",
                "description_en": "Question type"
            },
            "context": {
                "type": "string",
                "description_zh": "问题上下文（可选）",
                "description_en": "Question context (optional)"
            },
            "language": {
                "type": "string",
                "enum": ["zh", "en"],
                "description_zh": "问题语言偏好",
                "description_en": "Question language preference"
            }
        },
        "required": ["question"]
    }
    required_parameters = ["question"]

    async def execute(self, question: str, options: Optional[List[str]] = None,
                     question_type: str = "text", context: str = "",
                     language: str = "zh", user_id: Optional[str] = None,
                     **kwargs) -> ToolResult:
        """询问澄清问题 / Ask clarification question"""
        try:
            # 这个工具不需要实际执行操作，而是返回结构化的澄清请求
            clarification_data = {
                "type": "clarification",
                "question": question,
                "question_type": question_type,
                "context": context,
                "language": language
            }

            # 根据问题类型添加特定字段
            if question_type == "choice" or question_type == "multiple_choice":
                if not options:
                    return ToolResult(
                        success=False,
                        error="Options are required for choice questions",
                        message_zh="选择题需要提供选项",
                        message_en="Options are required for choice questions"
                    )
                clarification_data["options"] = options

            elif question_type == "scale":
                clarification_data["scale"] = {
                    "min": 1,
                    "max": 5,
                    "labels": options or []  # 例如：["很差", "差", "一般", "好", "很好"]
                }

            elif question_type == "yes_no":
                clarification_data["options"] = ["是", "Yes"] if language == "en" else ["是", "否"]

            # 生成用户友好的消息
            if language == "zh":
                message = f"需要您的澄清：{question}"
                if context:
                    message += f"\n背景：{context}"
                if question_type in ["choice", "multiple_choice"] and options:
                    message += f"\n选项：{', '.join(options)}"
            else:
                message = f"Clarification needed: {question}"
                if context:
                    message += f"\nContext: {context}"
                if question_type in ["choice", "multiple_choice"] and options:
                    message += f"\nOptions: {', '.join(options)}"

            # 记录这次澄清请求到记忆中
            if user_id:
                memory = AgentMemory.objects.create(
                    user_id=user_id,
                    memory_type='feedback',
                    content=f"Clarification request: {question}",
                    related_concept="user_interaction",
                    importance=0.6,
                    expires_at=timezone.now() + timedelta(days=7)
                )
                clarification_data["memory_id"] = str(memory.id)

            return ToolResult(
                success=True,
                data=clarification_data,
                message_zh=message,
                message_en=message if language == "en" else f"Clarification requested: {question}"
            )

        except Exception as e:
            return ToolResult(
                success=False,
                error=str(e),
                message_zh=f"创建澄清问题时出错: {str(e)}",
                message_en=f"Error creating clarification question: {str(e)}"
            )


@ToolRegistry.register
class SavePreferenceTool(BaseTool):
    """保存偏好工具 / Save preference tool"""
    name = "save_preference"
    category = "knowledge"
    description_zh = "保存用户偏好设置"
    description_en = "Save user preference settings"
    async_execution = True

    parameters = {
        "type": "object",
        "properties": {
            "preference_type": {
                "type": "string",
                "enum": ["language", "difficulty", "learning_style", "notification", "format"],
                "description_zh": "偏好类型",
                "description_en": "Preference type"
            },
            "value": {
                "type": "string",
                "description_zh": "偏好值",
                "description_en": "Preference value"
            },
            "description": {
                "type": "string",
                "description_zh": "偏好描述（可选）",
                "description_en": "Preference description (optional)"
            }
        },
        "required": ["preference_type", "value"]
    }
    required_parameters = ["preference_type", "value"]

    async def execute(self, preference_type: str, value: str, description: str = "",
                     user_id: Optional[str] = None, **kwargs) -> ToolResult:
        """保存用户偏好 / Save user preference"""
        try:
            if not user_id:
                return ToolResult(
                    success=False,
                    error="User ID is required",
                    message_zh="需要用户ID",
                    message_en="User ID is required"
                )

            # 检查是否已存在相同类型的偏好
            existing_memory = AgentMemory.objects.filter(
                user_id=user_id,
                memory_type='preference',
                related_concept=preference_type
            ).first()

            content = f"{preference_type}: {value}"
            if description:
                content += f"\n描述: {description}"

            if existing_memory:
                # 更新现有偏好
                existing_memory.content = content
                existing_memory.importance = 0.9  # 偏好重要性很高
                existing_memory.save()
                memory = existing_memory
            else:
                # 创建新偏好
                memory = AgentMemory.objects.create(
                    user_id=user_id,
                    memory_type='preference',
                    content=content,
                    related_concept=preference_type,
                    importance=0.9,
                    expires_at=timezone.now() + timedelta(days=3650)  # 10年不过期
                )

            return ToolResult(
                success=True,
                data={
                    "preference_type": preference_type,
                    "value": value,
                    "memory_id": str(memory.id),
                    "updated": existing_memory is not None
                },
                message_zh=f"偏好 '{preference_type}' 保存成功",
                message_en=f"Preference '{preference_type}' saved successfully"
            )

        except Exception as e:
            return ToolResult(
                success=False,
                error=str(e),
                message_zh=f"保存偏好时出错: {str(e)}",
                message_en=f"Error saving preference: {str(e)}"
            )