"""
WebSocket消费者 / WebSocket Consumers

处理Agent相关的WebSocket连接和实时通信
Handle Agent-related WebSocket connections and real-time communication
"""

import json
import logging
import asyncio
from typing import Optional, Dict, Any
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth.models import AnonymousUser
from django.utils import timezone

from .core.executor import ScholarAgent
from .models import Conversation, Message, AgentTask

logger = logging.getLogger(__name__)


class AgentConsumer(AsyncWebsocketConsumer):
    """
    Agent WebSocket消费者 / Agent WebSocket Consumer

    处理与AI Agent的实时对话通信
    Handles real-time conversation communication with AI Agent
    """

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.user = None
        self.conversation_id = None
        self.document_id = None
        self.agent = None
        self.current_task = None
        self.is_processing = False

    async def connect(self):
        """
        处理WebSocket连接 / Handle WebSocket connection
        """
        try:
            # 获取认证用户 / Get authenticated user
            self.user = self.scope.get('user')

            # 检查用户认证 / Check user authentication
            if isinstance(self.user, AnonymousUser):
                logger.warning("Anonymous user attempted WebSocket connection")
                await self.close(code=4001)  # 未授权 / Unauthorized
                return

            # 获取对话ID / Get conversation ID
            self.conversation_id = self.scope['url_route']['kwargs'].get('conversation_id')
            if not self.conversation_id:
                logger.error("No conversation_id provided in WebSocket URL")
                await self.close(code=4000)  # 错误请求 / Bad request
                return

            # 验证对话访问权限 / Validate conversation access permission
            has_access = await self.check_conversation_access()
            if not has_access:
                logger.warning(f"User {self.user.id} denied access to conversation {self.conversation_id}")
                await self.close(code=4003)  # 禁止访问 / Forbidden
                return

            # 接受连接 / Accept connection
            await self.accept()
            await self.send_json({
                "type": "connected",
                "message": "WebSocket连接已建立",
                "conversation_id": self.conversation_id,
                "user_id": str(self.user.id)
            })

            logger.info(f"WebSocket connected: user={self.user.username}, conversation={self.conversation_id}")

        except Exception as e:
            logger.error(f"WebSocket connection error: {e}")
            await self.close(code=4000)

    async def disconnect(self, close_code):
        """
        处理WebSocket断开连接 / Handle WebSocket disconnection

        Args:
            close_code: 关闭代码 / Close code
        """
        try:
            # 取消当前正在执行的任务 / Cancel currently executing task
            if self.current_task and not self.current_task.done():
                self.current_task.cancel()
                logger.info(f"Cancelled task for user {self.user.username}")

            logger.info(f"WebSocket disconnected: user={self.user.username if self.user else 'unknown'}, code={close_code}")

        except Exception as e:
            logger.error(f"WebSocket disconnect error: {e}")

    async def receive(self, text_data):
        """
        处理接收到的WebSocket消息 / Handle received WebSocket message

        Args:
            text_data: 文本消息数据 / Text message data
        """
        try:
            # 解析JSON消息 / Parse JSON message
            data = json.loads(text_data)
            message_type = data.get('type')

            logger.debug(f"Received WebSocket message: type={message_type}, user={self.user.username}")

            # 根据消息类型处理 / Handle based on message type
            if message_type == "query":
                await self.handle_query(data)
            elif message_type == "cancel":
                await self.handle_cancel()
            elif message_type == "set_document":
                await self.handle_set_document(data)
            elif message_type == "ping":
                await self.handle_ping()
            else:
                await self.send_json({
                    "type": "error",
                    "message": f"未知消息类型: {message_type}",
                    "code": "unknown_message_type"
                })

        except json.JSONDecodeError:
            await self.send_json({
                "type": "error",
                "message": "无效的JSON格式",
                "code": "invalid_json"
            })
        except Exception as e:
            logger.error(f"WebSocket message handling error: {e}")
            await self.send_json({
                "type": "error",
                "message": "消息处理出错",
                "code": "processing_error"
            })

    async def handle_query(self, data: Dict[str, Any]):
        """
        处理查询请求 / Handle query request

        Args:
            data: 查询数据 / Query data
        """
        try:
            # 检查是否正在处理其他查询 / Check if processing other queries
            if self.is_processing:
                await self.send_json({
                    "type": "error",
                    "message": "正在处理其他查询，请稍后再试",
                    "code": "already_processing"
                })
                return

            content = data.get('content', '').strip()
            if not content:
                await self.send_json({
                    "type": "error",
                    "message": "查询内容不能为空",
                    "code": "empty_content"
                })
                return

            context = data.get('context', {})

            # 设置处理标志 / Set processing flag
            self.is_processing = True

            # 创建Agent实例 / Create Agent instance
            self.agent = ScholarAgent(
                user_id=str(self.user.id),
                conversation_id=self.conversation_id,
                document_id=self.document_id
            )

            # 保存用户消息到数据库 / Save user message to database
            message = await self.save_message(content, context, "user")

            # 创建任务记录 / Create task record
            task = await self.create_task(message)

            # 执行Agent查询 / Execute Agent query
            try:
                # 创建异步任务 / Create async task
                self.current_task = asyncio.create_task(
                    self.execute_agent_query(content, context, task)
                )

                # 等待任务完成 / Wait for task completion
                await self.current_task

            except asyncio.CancelledError:
                logger.info(f"Query cancelled for user {self.user.username}")
                await self.send_json({
                    "type": "cancelled",
                    "message": "查询已取消"
                })
                # 更新任务状态 / Update task status
                if task:
                    await self.update_task_status(task, 'cancelled')

            except Exception as e:
                logger.error(f"Agent query execution error: {e}")
                await self.send_json({
                    "type": "error",
                    "message": "Agent执行出错",
                    "code": "execution_error"
                })
                # 更新任务状态 / Update task status
                if task:
                    await self.update_task_status(task, 'failed', str(e))

        except Exception as e:
            logger.error(f"Query handling error: {e}")
            await self.send_json({
                "type": "error",
                "message": "查询处理出错",
                "code": "query_error"
            })
        finally:
            self.is_processing = False
            self.current_task = None

    async def execute_agent_query(self, content: str, context: Dict[str, Any], task):
        """
        执行Agent查询 / Execute Agent query

        Args:
            content: 查询内容 / Query content
            context: 查询上下文 / Query context
            task: 任务对象 / Task object
        """
        try:
            # 执行Agent / Execute Agent
            async for event in self.agent.run(content, context):
                # 发送事件到客户端 / Send event to client
                await self.send_json(event)

                # 如果是最终答案，保存到数据库 / If final answer, save to database
                if event.get('type') == 'answer':
                    await self.save_message(event['data']['content'], {}, "assistant")
                    break

        except Exception as e:
            logger.error(f"Agent execution error: {e}")
            raise

    async def handle_cancel(self):
        """
        处理取消请求 / Handle cancel request
        """
        try:
            if self.current_task and not self.current_task.done():
                self.current_task.cancel()
                await self.send_json({
                    "type": "cancelled",
                    "message": "查询已取消"
                })
                logger.info(f"Query cancelled by user {self.user.username}")
            else:
                await self.send_json({
                    "type": "info",
                    "message": "没有正在执行的查询"
                })
        except Exception as e:
            logger.error(f"Cancel handling error: {e}")

    async def handle_set_document(self, data: Dict[str, Any]):
        """
        处理设置文档请求 / Handle set document request

        Args:
            data: 设置文档数据 / Set document data
        """
        try:
            document_id = data.get('document_id')
            if document_id:
                # 验证文档访问权限 / Validate document access permission
                has_access = await self.check_document_access(document_id)
                if has_access:
                    self.document_id = document_id
                    await self.send_json({
                        "type": "document_set",
                        "message": "文档已设置",
                        "document_id": document_id
                    })
                    logger.info(f"Document set for user {self.user.username}: {document_id}")
                else:
                    await self.send_json({
                        "type": "error",
                        "message": "无权访问该文档",
                        "code": "document_access_denied"
                    })
            else:
                await self.send_json({
                    "type": "error",
                    "message": "文档ID不能为空",
                    "code": "missing_document_id"
                })
        except Exception as e:
            logger.error(f"Set document error: {e}")
            await self.send_json({
                "type": "error",
                "message": "设置文档出错",
                "code": "set_document_error"
            })

    async def handle_ping(self):
        """
        处理ping消息 / Handle ping message
        """
        await self.send_json({
            "type": "pong",
            "timestamp": timezone.now().isoformat()
        })

    async def send_json(self, data: Dict[str, Any]):
        """
        发送JSON消息 / Send JSON message

        Args:
            data: 要发送的数据 / Data to send
        """
        try:
            # 确保中文字符正确编码 / Ensure Chinese characters are properly encoded
            await self.send(text_data=json.dumps(data, ensure_ascii=False, default=str))
        except Exception as e:
            logger.error(f"Send JSON error: {e}")

    @database_sync_to_async
    def check_conversation_access(self) -> bool:
        """
        检查对话访问权限 / Check conversation access permission

        Returns:
            bool: 是否有访问权限 / Whether access is allowed
        """
        try:
            return Conversation.objects.filter(
                id=self.conversation_id,
                user_id=self.user.id
            ).exists()
        except Exception as e:
            logger.error(f"Conversation access check error: {e}")
            return False

    @database_sync_to_async
    def check_document_access(self, document_id: str) -> bool:
        """
        检查文档访问权限 / Check document access permission

        Args:
            document_id: 文档ID / Document ID

        Returns:
            bool: 是否有访问权限 / Whether access is allowed
        """
        try:
            from apps.documents.models import Document
            return Document.objects.filter(
                id=document_id,
                user_id=self.user.id
            ).exists()
        except Exception as e:
            logger.error(f"Document access check error: {e}")
            return False

    @database_sync_to_async
    def save_message(self, content: str, context: Dict[str, Any], role: str) -> Message:
        """
        保存消息到数据库 / Save message to database

        Args:
            content: 消息内容 / Message content
            context: 消息上下文 / Message context
            role: 消息角色 / Message role

        Returns:
            Message: 保存的消息对象 / Saved message object
        """
        try:
            message = Message.objects.create(
                conversation_id=self.conversation_id,
                role=role,
                content=content,
                context_data=context,
                context_type=context.get('type', 'none') if context else 'none'
            )

            # 更新对话的消息计数 / Update conversation message count
            conversation = Conversation.objects.get(id=self.conversation_id)
            conversation.message_count += 1
            conversation.updated_at = timezone.now()
            conversation.save()

            return message

        except Exception as e:
            logger.error(f"Save message error: {e}")
            raise

    @database_sync_to_async
    def create_task(self, message: Message) -> AgentTask:
        """
        创建任务记录 / Create task record

        Args:
            message: 关联的消息 / Associated message

        Returns:
            AgentTask: 创建的任务对象 / Created task object
        """
        try:
            return AgentTask.objects.create(
                conversation_id=self.conversation_id,
                message=message,
                status='executing'
            )
        except Exception as e:
            logger.error(f"Create task error: {e}")
            raise

    @database_sync_to_async
    def update_task_status(self, task: AgentTask, status: str, error_message: str = ""):
        """
        更新任务状态 / Update task status

        Args:
            task: 任务对象 / Task object
            status: 新状态 / New status
            error_message: 错误消息 / Error message
        """
        try:
            task.status = status
            if error_message:
                task.error_message = error_message
            task.completed_at = timezone.now()
            task.save()
        except Exception as e:
            logger.error(f"Update task status error: {e}")