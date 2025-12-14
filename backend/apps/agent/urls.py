from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ConversationViewSet, MessageViewSet, AgentTaskViewSet, AgentMemoryViewSet, ai_chat

router = DefaultRouter()
router.register(r'conversations', ConversationViewSet, basename='agent-conversations')
router.register(r'messages', MessageViewSet, basename='agent-messages')
router.register(r'tasks', AgentTaskViewSet, basename='agent-tasks')
router.register(r'memories', AgentMemoryViewSet, basename='agent-memories')

app_name = 'agent'

urlpatterns = [
    path('', include(router.urls)),
    path('chat/', ai_chat, name='ai-chat'),
]
