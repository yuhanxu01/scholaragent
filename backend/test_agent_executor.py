"""
Agent 执行引擎测试 / Agent Executor Tests

测试ScholarAgent的基本功能
"""

import asyncio
import os
import django
from django.test import TestCase
from django.contrib.auth import get_user_model
from unittest.mock import AsyncMock, patch, MagicMock

# 设置Django环境 / Set up Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.test_sqlite')
django.setup()

# 模拟缺失的模型和工具，避免导入错误 / Mock missing models and tools to avoid import errors
import sys
from unittest.mock import MagicMock

# Mock the tools module to avoid import issues
sys.modules['apps.agent.tools'] = MagicMock()
sys.modules['apps.agent.tools.registry'] = MagicMock()
sys.modules['apps.agent.tools.base'] = MagicMock()

# Mock ToolRegistry
mock_registry = MagicMock()
mock_registry.get_tool_descriptions.return_value = "可用工具：\n- test_tool: 测试工具"
mock_registry.get.return_value = None  # No tools available for testing
sys.modules['apps.agent.tools.registry'].ToolRegistry = mock_registry

from apps.agent.core.executor import ScholarAgent
from apps.agent.models import Conversation, Message

User = get_user_model()


class TestScholarAgent(TestCase):
    """ScholarAgent测试 / ScholarAgent tests"""

    def setUp(self):
        """设置测试环境 / Set up test environment"""
        # 使用唯一标识符避免冲突 / Use unique identifier to avoid conflicts
        import uuid
        unique_id = str(uuid.uuid4())[:8]

        self.user = User.objects.create_user(
            username=f"testuser_{unique_id}",
            email=f"test_{unique_id}@example.com",
            password="testpass123"
        )
        self.conversation = Conversation.objects.create(
            user=self.user,
            title="测试对话"
        )
        # 创建用户消息 / Create user message
        self.user_message = Message.objects.create(
            conversation=self.conversation,
            role="user",
            content="测试问题"
        )

    async def async_test_basic_execution(self):
        """测试基本执行流程 / Test basic execution flow"""
        agent = ScholarAgent(
            user_id=str(self.user.id),
            conversation_id=str(self.conversation.id)
        )

        # Mock LLM responses
        with patch('apps.agent.core.executor.get_llm_client') as mock_get_client:
            mock_client = AsyncMock()
            # Mock planning response - no tools needed
            mock_client.generate_json.side_effect = [
                {"intent": "解释概念", "needs_tools": False, "plan": ["直接回答"], "estimated_tools": []},
                "机器学习是一种人工智能的分支，通过算法让计算机从数据中学习并做出预测或决策。"
            ]
            mock_get_client.return_value = mock_client

            # 模拟用户输入 / Mock user input
            user_input = "请解释什么是机器学习"
            context = {"message_id": str(self.user_message.id)}

            # 收集执行事件 / Collect execution events
            events = []
            async for event in agent.run(user_input, context):
                events.append(event)

            # 验证事件序列 / Verify event sequence
            self.assertGreater(len(events), 0)

            # 应该包含状态变化 / Should include state changes
            state_events = [e for e in events if e['type'] == 'state']
            self.assertGreater(len(state_events), 0)

            # 应该包含计划 / Should include plan
            plan_events = [e for e in events if e['type'] == 'plan']
            self.assertEqual(len(plan_events), 1)

            # 应该包含最终答案 / Should include final answer
            answer_events = [e for e in events if e['type'] == 'answer']
            self.assertEqual(len(answer_events), 1)

    async def async_test_error_handling(self):
        """测试错误处理 / Test error handling"""
        agent = ScholarAgent(
            user_id=str(self.user.id),
            conversation_id=str(self.conversation.id)
        )

        # Mock LLM call failure
        with patch('apps.agent.core.executor.get_llm_client') as mock_get_client:
            mock_client = AsyncMock()
            mock_client.generate_json.side_effect = Exception("LLM服务不可用")
            mock_get_client.return_value = mock_client

            user_input = "测试问题"
            context = {"message_id": str(self.user_message.id)}

            events = []
            async for event in agent.run(user_input, context):
                events.append(event)

            # 应该包含错误事件 / Should include error events
            error_events = [e for e in events if e['type'] == 'error']
            self.assertGreater(len(error_events), 0)

    def test_agent_initialization(self):
        """测试Agent初始化 / Test agent initialization"""
        agent = ScholarAgent(
            user_id=str(self.user.id),
            conversation_id=str(self.conversation.id),
            document_id="test-doc-id"
        )

        self.assertEqual(agent.user_id, str(self.user.id))
        self.assertEqual(agent.conversation_id, str(self.conversation.id))
        self.assertEqual(agent.document_id, "test-doc-id")
        self.assertIsNotNone(agent.memory)
        self.assertEqual(agent.execution_history, [])

    def test_max_iterations(self):
        """测试最大迭代次数 / Test maximum iterations"""
        agent = ScholarAgent(
            user_id=str(self.user.id),
            conversation_id=str(self.conversation.id)
        )

        self.assertEqual(agent.MAX_ITERATIONS, 8)


# 运行异步测试的辅助函数 / Helper function to run async tests
def run_async_test(test_func):
    """运行异步测试 / Run async test"""
    asyncio.run(test_func())


if __name__ == '__main__':
    # 运行基本测试 / Run basic tests
    print("运行Agent执行引擎测试... / Running Agent executor tests...")

    test_instance = TestScholarAgent()
    test_instance.setUp()

    try:
        print("测试基本执行流程... / Testing basic execution flow...")
        run_async_test(test_instance.async_test_basic_execution)
        print("✓ 基本执行流程测试通过 / Basic execution flow test passed")

    except Exception as e:
        print(f"✗ 基本执行流程测试失败: {e} / Basic execution flow test failed: {e}")

    # 跳过工具执行测试，因为工具系统还没有完全实现 / Skip tool execution test as tool system is not fully implemented
    print("跳过工具执行流程测试（工具系统未完全实现）/ Skipping tool execution flow test (tool system not fully implemented)")

    try:
        print("测试错误处理... / Testing error handling...")
        run_async_test(test_instance.async_test_error_handling)
        print("✓ 错误处理测试通过 / Error handling test passed")

    except Exception as e:
        print(f"✗ 错误处理测试失败: {e} / Error handling test failed: {e}")

    print("测试完成 / Tests completed")