from rest_framework.test import APITestCase, APIClient
from django.contrib.auth import get_user_model
from unittest.mock import patch, AsyncMock

User = get_user_model()


class BaseAPITestCase(APITestCase):
    """API测试基类"""

    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    def tearDown(self):
        User.objects.all().delete()


class MockLLMResponse:
    """Mock LLM响应"""

    @staticmethod
    def generate_index():
        return {
            "content": {
                "summary": "这是一篇关于微积分的文档",
                "sections": [{"title": "第一章", "summary": "基础概念"}],
                "concepts": [{"name": "导数", "type": "definition", "description": "函数的变化率"}],
                "keywords": ["微积分", "导数", "积分"],
                "difficulty": 3,
                "domain": "数学"
            }
        }

    @staticmethod
    def generate_plan():
        return {
            "content": {
                "intent": "用户想了解导数的定义",
                "needs_tools": True,
                "plan": ["搜索概念", "生成解释"],
                "estimated_tools": ["search_concepts", "generate_explanation"]
            }
        }


def mock_llm_client():
    """创建Mock LLM客户端"""
    mock = AsyncMock()
    mock.generate = AsyncMock(return_value=MockLLMResponse.generate_index())
    return mock