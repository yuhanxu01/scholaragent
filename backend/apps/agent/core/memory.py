"""
记忆管理模块 / Memory Management Module

负责管理Agent的短期记忆和工作记忆，以及长期记忆的检索和存储
"""

import logging
import json
from typing import Dict, List, Any, Optional
from datetime import datetime, timedelta
from django.utils import timezone

from apps.agent.models import AgentMemory, Conversation, Message
from core.llm import get_llm_client
from apps.billing.services import TokenUsageService
from django.contrib.auth import get_user_model
from .prompts import MEMORY_COMPRESSION_PROMPT, USER_PROFILE_PROMPT

User = get_user_model()

logger = logging.getLogger(__name__)


class MemoryManager:
    """Agent记忆管理器 / Agent Memory Manager"""

    def __init__(self, user_id: str, conversation_id: str):
        """
        初始化记忆管理器 / Initialize memory manager

        Args:
            user_id: 用户ID / User ID
            conversation_id: 对话ID / Conversation ID
        """
        self.user_id = user_id
        self.conversation_id = conversation_id
        self._working_memory = {}  # 工作记忆 / Working memory
        self._session_cache = {}   # 会话缓存 / Session cache

    async def get_context(self, query: str) -> Dict[str, Any]:
        """
        获取相关记忆上下文 / Get relevant memory context

        Args:
            query: 查询内容 / Query content

        Returns:
            Dict: 包含用户画像、会话摘要、相关记忆的上下文 / Context with user profile, session summary, relevant memories
        """
        try:
            context = {
                "user_profile": await self._get_user_profile(),
                "session_summary": await self._get_session_summary(),
                "relevant_memories": await self._get_relevant_memories(query),
                "working_memory": self._working_memory.copy()
            }
            return context
        except Exception as e:
            logger.error(f"获取记忆上下文失败: {e}")
            return {
                "user_profile": {},
                "session_summary": "",
                "relevant_memories": [],
                "working_memory": {}
            }

    async def _get_user_profile(self) -> Dict[str, Any]:
        """
        获取用户画像 / Get user profile

        Returns:
            Dict: 用户画像信息 / User profile information
        """
        try:
            # 从缓存获取 / Get from cache
            if "user_profile" in self._session_cache:
                return self._session_cache["user_profile"]

            # 从长期记忆中获取用户偏好 / Get user preferences from long-term memory
            preferences = await AgentMemory.objects.filter(
                user_id=self.user_id,
                memory_type="preference",
                expires_at__isnull=True
            ).order_by('-importance', '-updated_at')[:5]

            profile = {
                "preferences": [mem.content for mem in preferences],
                "learning_style": "",
                "knowledge_level": "",
                "interests": []
            }

            # 如果没有足够信息，尝试从对话历史生成 / Generate from conversation history if not enough info
            if len(preferences) < 3:
                profile = await self._generate_user_profile()

            # 缓存结果 / Cache result
            self._session_cache["user_profile"] = profile
            return profile

        except Exception as e:
            logger.error(f"获取用户画像失败: {e}")
            return {}

    async def _generate_user_profile(self) -> Dict[str, Any]:
        """
        从对话历史生成用户画像 / Generate user profile from conversation history

        Returns:
            Dict: 生成的用户画像 / Generated user profile
        """
        try:
            # 获取最近的对话历史 / Get recent conversation history
            messages = await Message.objects.filter(
                conversation_id=self.conversation_id
            ).order_by('-created_at')[:20]

            if not messages:
                return {}

            # 准备提示词 / Prepare prompt
            messages_text = "\n".join([
                f"{msg.role}: {msg.content[:200]}..."
                for msg in reversed(messages)
            ])

            prompt = USER_PROFILE_PROMPT.format(
                messages=messages_text,
                behaviors="[]"  # 可以后续扩展 / Can be extended later
            )

            # 调用LLM生成画像 / Call LLM to generate profile
            llm_client = get_llm_client()
            response = await llm_client.generate_json(prompt=prompt)

            # 记录token使用
            if 'usage' in response:
                usage = response['usage']
                input_tokens = usage.get('prompt_tokens', 0)
                output_tokens = usage.get('completion_tokens', 0)
                if input_tokens > 0 or output_tokens > 0:
                    try:
                        user = await User.objects.aget(id=self.user_id)
                        await TokenUsageService.record_token_usage(
                            user=user,
                            input_tokens=input_tokens,
                            output_tokens=output_tokens,
                            api_type='agent_execution',
                            metadata={
                                'function': 'generate_user_profile',
                                'conversation_id': self.conversation_id
                            }
                        )
                    except Exception as e:
                        logger.warning(f"记录token使用失败: {e}")

            return response

        except Exception as e:
            logger.error(f"生成用户画像失败: {e}")
            return {}

    async def _get_session_summary(self) -> str:
        """
        获取会话摘要 / Get session summary

        Returns:
            str: 会话摘要 / Session summary
        """
        try:
            # 从缓存获取 / Get from cache
            if "session_summary" in self._session_cache:
                return self._session_cache["session_summary"]

            # 获取对话的摘要 / Get conversation summary
            conversation = await Conversation.objects.aget(id=self.conversation_id)
            summary = conversation.summary or ""

            # 如果没有摘要，从消息生成 / Generate from messages if no summary
            if not summary:
                summary = await self._generate_session_summary()

            # 缓存结果 / Cache result
            self._session_cache["session_summary"] = summary
            return summary

        except Exception as e:
            logger.error(f"获取会话摘要失败: {e}")
            return ""

    async def _generate_session_summary(self) -> str:
        """
        生成会话摘要 / Generate session summary

        Returns:
            str: 生成的摘要 / Generated summary
        """
        try:
            # 获取最近的消息 / Get recent messages
            messages = await Message.objects.filter(
                conversation_id=self.conversation_id
            ).order_by('-created_at')[:10]

            if not messages:
                return ""

            # 准备消息历史 / Prepare message history
            messages_text = "\n".join([
                f"{msg.role}: {msg.content[:300]}..."
                for msg in reversed(messages)
            ])

            prompt = MEMORY_COMPRESSION_PROMPT.format(messages=messages_text)

            # 调用LLM生成摘要 / Call LLM to generate summary
            llm_client = get_llm_client()
            response = await llm_client.generate_json(prompt=prompt)

            # 记录token使用
            if 'usage' in response:
                usage = response['usage']
                input_tokens = usage.get('prompt_tokens', 0)
                output_tokens = usage.get('completion_tokens', 0)
                if input_tokens > 0 or output_tokens > 0:
                    try:
                        user = await User.objects.aget(id=self.user_id)
                        await TokenUsageService.record_token_usage(
                            user=user,
                            input_tokens=input_tokens,
                            output_tokens=output_tokens,
                            api_type='agent_execution',
                            metadata={
                                'function': 'generate_session_summary',
                                'conversation_id': self.conversation_id
                            }
                        )
                    except Exception as e:
                        logger.warning(f"记录token使用失败: {e}")

            return response.get("summary", "")

        except Exception as e:
            logger.error(f"生成会话摘要失败: {e}")
            return ""

    async def _get_relevant_memories(self, query: str) -> List[Dict[str, Any]]:
        """
        获取相关记忆 / Get relevant memories

        Args:
            query: 查询内容 / Query content

        Returns:
            List[Dict]: 相关记忆列表 / List of relevant memories
        """
        try:
            # 搜索相关记忆 / Search relevant memories
            memories = await AgentMemory.objects.filter(
                user_id=self.user_id,
                expires_at__isnull=True  # 未过期 / Not expired
            ).filter(
                # 简单关键词匹配 / Simple keyword matching
                content__icontains=query
            ).order_by('-importance', '-access_count', '-updated_at')[:5]

            # 更新访问计数 / Update access count
            for memory in memories:
                memory.access_count += 1
                memory.last_accessed = timezone.now()
                await memory.asave()

            return [
                {
                    "type": mem.memory_type,
                    "content": mem.content,
                    "importance": mem.importance,
                    "related_concept": mem.related_concept
                }
                for mem in memories
            ]

        except Exception as e:
            logger.error(f"获取相关记忆失败: {e}")
            return []

    async def compress_and_save_session(self, messages: List[Dict[str, Any]]):
        """
        压缩并保存会话历史 / Compress and save session history

        Args:
            messages: 消息列表 / List of messages
        """
        try:
            if not messages:
                return

            # 生成压缩摘要 / Generate compressed summary
            messages_text = "\n".join([
                f"{msg.get('role', 'unknown')}: {msg.get('content', '')[:300]}..."
                for msg in messages[-20:]  # 最近20条消息 / Last 20 messages
            ])

            prompt = MEMORY_COMPRESSION_PROMPT.format(messages=messages_text)

            llm_client = get_llm_client()
            response = await llm_client.generate_json(prompt=prompt)

            # 记录token使用
            if 'usage' in response:
                usage = response['usage']
                input_tokens = usage.get('prompt_tokens', 0)
                output_tokens = usage.get('completion_tokens', 0)
                if input_tokens > 0 or output_tokens > 0:
                    try:
                        user = await User.objects.aget(id=self.user_id)
                        await TokenUsageService.record_token_usage(
                            user=user,
                            input_tokens=input_tokens,
                            output_tokens=output_tokens,
                            api_type='agent_execution',
                            metadata={
                                'function': 'compress_and_save_session',
                                'conversation_id': self.conversation_id
                            }
                        )
                    except Exception as e:
                        logger.warning(f"记录token使用失败: {e}")

            # 保存到对话摘要 / Save to conversation summary
            conversation = await Conversation.objects.aget(id=self.conversation_id)
            conversation.summary = response.get("summary", "")
            conversation.message_count = len(messages)
            await conversation.asave()

            # 保存关键记忆 / Save key memories
            key_points = response.get("key_points", [])
            for point in key_points:
                await AgentMemory.objects.acreate(
                    user_id=self.user_id,
                    memory_type="conversation",
                    content=point,
                    importance=0.5,
                    related_concept=""
                )

        except Exception as e:
            logger.error(f"压缩会话历史失败: {e}")

    def update_working_memory(self, key: str, value: Any):
        """
        更新工作记忆 / Update working memory

        Args:
            key: 键 / Key
            value: 值 / Value
        """
        self._working_memory[key] = value

    def get_working_memory(self, key: str) -> Any:
        """
        获取工作记忆 / Get working memory

        Args:
            key: 键 / Key

        Returns:
            Any: 值 / Value
        """
        return self._working_memory.get(key)

    def clear_session_cache(self):
        """清空会话缓存 / Clear session cache"""
        self._session_cache.clear()

    async def save_memory(self, memory_type: str, content: str,
                         importance: float = 0.5, related_concept: str = "",
                         related_document_id: str = None):
        """
        保存长期记忆 / Save long-term memory

        Args:
            memory_type: 记忆类型 / Memory type
            content: 内容 / Content
            importance: 重要性 / Importance
            related_concept: 相关概念 / Related concept
            related_document_id: 相关文档ID / Related document ID
        """
        try:
            await AgentMemory.objects.acreate(
                user_id=self.user_id,
                memory_type=memory_type,
                content=content,
                importance=importance,
                related_concept=related_concept,
                related_document_id=related_document_id
            )
        except Exception as e:
            logger.error(f"保存记忆失败: {e}")