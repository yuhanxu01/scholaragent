from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.generics import get_object_or_404
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Q, Prefetch
from asgiref.sync import async_to_sync
import logging

from .models import Conversation, Message, AgentTask, ToolCall, AgentMemory
from .serializers import (
    ConversationSerializer, ConversationDetailSerializer, ConversationCreateSerializer,
    MessageSerializer, MessageCreateSerializer,
    AgentTaskSerializer, AgentTaskCreateSerializer,
    AgentMemorySerializer
)
from .permissions import IsOwner
from core.llm import get_llm_client
from apps.billing.services import TokenUsageService

logger = logging.getLogger(__name__)


class ConversationViewSet(viewsets.ModelViewSet):
    """对话会话视图集"""
    serializer_class = ConversationSerializer
    permission_classes = [permissions.IsAuthenticated, IsOwner]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['document', 'is_active']
    search_fields = ['title', 'summary']

    def get_queryset(self):
        """只返回当前用户的对话"""
        queryset = Conversation.objects.filter(user=self.request.user)
        # 预加载消息数量
        queryset = queryset.prefetch_related(
            Prefetch('messages', queryset=Message.objects.only('id'))
        )
        return queryset

    def get_serializer_class(self):
        """根据action选择序列化器"""
        if self.action == 'create':
            return ConversationCreateSerializer
        if self.action == 'retrieve':
            return ConversationDetailSerializer
        if self.action == 'list':
            return ConversationSerializer
        return ConversationSerializer

    def perform_create(self, serializer):
        """创建对话时设置用户"""
        serializer.save(user=self.request.user)

    @action(detail=True, methods=['get'])
    def messages(self, request, pk=None):
        """获取对话的所有消息"""
        conversation = self.get_object()
        messages = conversation.messages.all()
        page = self.paginate_queryset(messages)
        serializer = MessageSerializer(page, many=True)
        return self.get_paginated_response(serializer.data)

    @action(detail=True, methods=['post'])
    def add_message(self, request, pk=None):
        """添加消息到对话"""
        conversation = self.get_object()
        serializer = MessageCreateSerializer(data=request.data)

        if serializer.is_valid():
            # 创建消息
            message = serializer.save(
                conversation=conversation,
                role=request.data.get('role', 'user')
            )

            # 更新对话的消息数量
            conversation.message_count = conversation.messages.count()
            conversation.save(update_fields=['message_count'])

            # 如果是用户消息，创建Agent任务
            if message.role == 'user':
                task = AgentTask.objects.create(
                    conversation=conversation,
                    message=message,
                    status='pending'
                )

            return Response(
                MessageSerializer(message).data,
                status=status.HTTP_201_CREATED
            )

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['get'])
    def tasks(self, request, pk=None):
        """获取对话的所有任务"""
        conversation = self.get_object()
        tasks = conversation.tasks.all().order_by('-created_at')
        page = self.paginate_queryset(tasks)
        serializer = AgentTaskSerializer(page, many=True)
        return self.get_paginated_response(serializer.data)

    @action(detail=True, methods=['post'])
    def archive(self, request, pk=None):
        """归档对话（设置为非活跃）"""
        conversation = self.get_object()
        conversation.is_active = False
        conversation.save(update_fields=['is_active'])
        return Response({'status': 'archived'})

    @action(detail=True, methods=['post'])
    def unarchive(self, request, pk=None):
        """取消归档对话（设置为活跃）"""
        conversation = self.get_object()
        conversation.is_active = True
        conversation.save(update_fields=['is_active'])
        return Response({'status': 'unarchived'})


class MessageViewSet(viewsets.ModelViewSet):
    """消息视图集"""
    serializer_class = MessageSerializer
    permission_classes = [permissions.IsAuthenticated, IsOwner]

    def get_queryset(self):
        """只返回当前用户可以访问的消息"""
        return Message.objects.filter(
            conversation__user=self.request.user
        ).select_related('conversation')

    def get_serializer_class(self):
        if self.action == 'create':
            return MessageCreateSerializer
        return MessageSerializer

    def perform_create(self, serializer):
        """创建消息时验证对话权限"""
        conversation_id = serializer.validated_data['conversation'].id
        conversation = get_object_or_404(
            Conversation,
            id=conversation_id,
            user=self.request.user
        )
        serializer.save()


class AgentTaskViewSet(viewsets.ReadOnlyModelViewSet):
    """Agent任务视图集（只读）"""
    serializer_class = AgentTaskSerializer
    permission_classes = [permissions.IsAuthenticated, IsOwner]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['status', 'conversation']

    def get_queryset(self):
        """只返回当前用户的任务"""
        return AgentTask.objects.filter(
            conversation__user=self.request.user
        ).select_related(
            'conversation', 'message'
        ).prefetch_related('tool_calls')

    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        """取消任务"""
        task = self.get_object()
        if task.status in ['pending', 'planning', 'executing']:
            task.status = 'cancelled'
            task.save(update_fields=['status'])
            return Response({'status': 'cancelled'})
        return Response(
            {'error': 'Task cannot be cancelled'},
            status=status.HTTP_400_BAD_REQUEST
        )


class AgentMemoryViewSet(viewsets.ModelViewSet):
    """Agent记忆视图集"""
    serializer_class = AgentMemorySerializer
    permission_classes = [permissions.IsAuthenticated, IsOwner]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['memory_type', 'related_document']
    search_fields = ['content', 'related_concept']

    def get_queryset(self):
        """只返回当前用户的记忆"""
        return AgentMemory.objects.filter(
            user=self.request.user
        ).select_related('related_document')

    def perform_create(self, serializer):
        """创建记忆时设置用户"""
        serializer.save(user=self.request.user)

    @action(detail=False, methods=['get'])
    def preferences(self, request):
        """获取用户偏好记忆"""
        memories = self.get_queryset().filter(memory_type='preference')
        serializer = self.get_serializer(memories, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def knowledge(self, request):
        """获取知识记忆"""
        memories = self.get_queryset().filter(memory_type='knowledge')
        serializer = self.get_serializer(memories, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['post'])
    def update_importance(self, request):
        """批量更新记忆重要性"""
        memory_ids = request.data.get('memory_ids', [])
        importance = request.data.get('importance', 0.5)

        if not 0 <= importance <= 1:
            return Response(
                {'error': 'Importance must be between 0 and 1'},
                status=status.HTTP_400_BAD_REQUEST
            )

        updated = self.get_queryset().filter(
            id__in=memory_ids
        ).update(importance=importance)

        return Response({'updated_count': updated})



@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def ai_chat(request):
    """AI 聊天端点 - 调用 DeepSeek API"""
    message = request.data.get('message', '')
    context = request.data.get('context', {})
    conversation_history = request.data.get('conversationHistory', [])
    
    if not message:
        return Response(
            {'error': '消息不能为空'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # 构建系统提示词
    system_prompt = build_system_prompt(context, request.user)
    
    # 构建消息列表
    messages = []
    for msg in conversation_history:
        messages.append({
            'role': msg.get('role', 'user'),
            'content': msg.get('content', '')
        })
    
    try:
        # 调用 DeepSeek API
        client = get_llm_client()
        result = async_to_sync(client.generate)(
            prompt=message,
            system_prompt=system_prompt,
            temperature=0.7,
            max_tokens=2000,
        )

        response_text = result.get('content', '抱歉，我无法处理你的请求。')

        # 记录token使用
        usage = result.get('usage', {})
        input_tokens = usage.get('prompt_tokens', 0)
        output_tokens = usage.get('completion_tokens', 0)

        if input_tokens > 0 or output_tokens > 0:
            TokenUsageService.record_token_usage(
                user=request.user,
                input_tokens=input_tokens,
                output_tokens=output_tokens,
                api_type='ai_chat',
                metadata={
                    'page_type': context.get('pageType', ''),
                    'page_title': context.get('pageTitle', ''),
                    'message_length': len(message)
                }
            )

        return Response({
            'response': response_text,
            'suggestedActions': generate_suggested_actions(message, context)
        })
        
    except Exception as e:
        logger.error(f"AI chat error: {e}")
        # 当 DeepSeek API 不可用时，返回模拟响应
        fallback_response = get_fallback_response(message, context, request.user)

        # 即使是fallback响应，也要记录估算的token使用量
        estimated_input_tokens = len(message.split()) + len(str(context))
        estimated_output_tokens = len(fallback_response.split())

        TokenUsageService.record_token_usage(
            user=request.user,
            input_tokens=estimated_input_tokens,
            output_tokens=estimated_output_tokens,
            api_type='ai_chat',
            metadata={
                'page_type': context.get('pageType', ''),
                'page_title': context.get('pageTitle', ''),
                'message_length': len(message),
                'fallback': True,
                'error': str(e)
            }
        )

        return Response({
            'response': fallback_response,
            'suggestedActions': generate_suggested_actions(message, context)
        })


def get_fallback_response(message: str, context: dict, user) -> str:
    """当 AI API 不可用时生成备用响应"""
    lower_message = message.lower()
    page_type = context.get('pageType', '')
    user_name = user.first_name or user.username
    
    # 基于页面类型和消息内容的智能响应
    if page_type == 'dashboard':
        if '文档' in lower_message or 'upload' in lower_message or 'document' in lower_message:
            return f'你好 {user_name}！我可以帮你上传文档。请点击"上传文档"按钮，或者前往文档页面。支持的格式包括 PDF、Word、PowerPoint 等。'
        if '笔记' in lower_message or 'note' in lower_message or 'create' in lower_message:
            return f'你好 {user_name}！我可以帮你创建笔记。点击"创建笔记"按钮，或者前往知识库页面。我可以帮你整理格式、添加标签等。'
        if '帮助' in lower_message or 'help' in lower_message or '如何' in lower_message:
            return f'''你好 {user_name}！作为你的学术助手，我可以帮你：

📄 **文档管理** - 上传、搜索和阅读学术文档
📝 **笔记创建** - 创建和管理学习笔记
🎯 **概念管理** - 建立知识概念图谱
📚 **学习卡片** - 使用间隔重复法复习

有什么具体需要帮助的吗？'''
    
    if page_type == 'documents':
        if '搜索' in lower_message or 'search' in lower_message or '查找' in lower_message:
            return '我可以帮你搜索文档！请在搜索框中输入关键词，或者告诉我你想要查找什么类型的文档。'
        if '上传' in lower_message or 'upload' in lower_message:
            return '要上传文档，请点击页面上的"上传"按钮，然后选择你要上传的文件。支持 PDF、Word、PowerPoint 等格式。'
    
    if page_type == 'knowledge':
        if '概念' in lower_message or 'concept' in lower_message:
            return '我可以帮你管理知识概念！你可以创建新的概念、建立概念之间的关联，或者查看概念图谱来了解知识结构。'
        if '卡片' in lower_message or 'flashcard' in lower_message or '学习' in lower_message:
            return '学习卡片是很好的记忆工具！我可以帮你创建学习卡片，或者开始一个学习会话来复习现有卡片。使用间隔重复法可以提高记忆效率。'
    
    # 默认响应
    responses = [
        f'你好 {user_name}！作为你的学术助手，我可以帮你处理文档、管理知识、创建笔记等。请告诉我你想要做什么？',
        f'{user_name}，我注意到你在当前页面可能需要一些帮助。我可以提供页面相关的指导，或者回答你的学术问题。',
        f'有什么学术相关的问题我可以帮助你解决吗？无论是文档处理、知识管理还是学习建议，我都很乐意帮忙。'
    ]
    
    import random
    return random.choice(responses)


def build_system_prompt(context: dict, user) -> str:
    """构建系统提示词"""
    prompt = f"""你是一个专业的学术 AI 助手，名字叫 ScholarMind。你的主要职责是：

1. 帮助用户处理学术文档和资料
2. 协助创建和管理学习笔记
3. 提供学术建议和学习指导
4. 回答学术相关的问题

当前上下文信息：
- 用户：{user.first_name or user.username}
- 当前页面：{context.get('pageTitle', '未知页面')}
- 页面类型：{context.get('pageType', '通用')}"""

    page_type = context.get('pageType', '')
    if page_type == 'dashboard':
        prompt += """

用户目前在仪表板页面，可以：
- 上传和管理文档
- 创建学习笔记
- 使用 AI 助手功能
- 查看学习统计信息"""
    elif page_type == 'documents':
        prompt += """

用户目前在文档页面，可以：
- 上传新文档
- 搜索和查看现有文档
- 阅读和标注文档"""
    elif page_type == 'knowledge':
        prompt += """

用户目前在知识库页面，可以：
- 创建和管理笔记
- 管理学习概念
- 使用学习卡片
- 搜索知识内容"""

    prompt += """

请根据用户的当前页面和问题，提供有针对性的学术帮助。回答要简洁明了，避免过于冗长。如果用户问的是非学术问题，礼貌地引导回到学术话题。"""

    return prompt


def generate_suggested_actions(message: str, context: dict) -> list:
    """生成建议操作"""
    actions = []
    lower_message = message.lower()
    page_type = context.get('pageType', '')

    if page_type == 'dashboard':
        if '文档' in lower_message or 'upload' in lower_message:
            actions.append({
                'type': 'navigate',
                'label': '前往文档页面',
                'action': '/documents'
            })
        if '笔记' in lower_message or 'note' in lower_message:
            actions.append({
                'type': 'navigate',
                'label': '打开知识库',
                'action': '/knowledge'
            })

    return actions
