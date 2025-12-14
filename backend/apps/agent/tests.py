import pytest
from unittest.mock import patch, AsyncMock
from apps.agent.core.executor import ScholarAgent
from apps.agent.tools.registry import ToolRegistry
from tests.base import BaseAPITestCase


class ToolRegistryTest(BaseAPITestCase):
    """工具注册测试"""

    def test_tool_registration(self):
        """测试工具注册"""
        self.assertIn('search_concepts', ToolRegistry._tools)
        self.assertIn('generate_explanation', ToolRegistry._tools)

    def test_tool_schema(self):
        """测试工具Schema生成"""
        tool = ToolRegistry.get('search_concepts')
        schema = tool.get_schema()

        self.assertEqual(schema['name'], 'search_concepts')
        self.assertIn('description', schema)
        self.assertIn('parameters', schema)


@pytest.mark.asyncio
class AgentExecutorTest(BaseAPITestCase):
    """Agent执行器测试"""

    async def test_simple_query(self):
        """测试简单问答"""
        with patch('core.llm.get_llm_client') as mock_llm:
            mock_llm.generate = AsyncMock(return_value={
                "content": {
                    "intent": "直接回答",
                    "needs_tools": False,
                    "plan": []
                }
            })

            agent = ScholarAgent(
                user_id=self.user.id,
                conversation_id='test-conv'
            )

            events = []
            async for event in agent.run("你好", {}):
                events.append(event)

            # 验证有答案返回
            event_types = [e['type'] for e in events]
            self.assertIn('answer', event_types)

    async def test_tool_execution(self):
        """测试工具调用"""
        with patch('core.llm.get_llm_client') as mock_llm:
            # Mock规划返回
            mock_llm.generate = AsyncMock(side_effect=[
                {"content": {"intent": "查找概念", "needs_tools": True, "plan": ["搜索"]}},
                {"content": {"thought": "需要搜索", "action": "search_concepts", "action_input": {"query": "导数"}}},
                {"content": {"thought": "找到了", "final_answer": "导数是..."}}
            ])

            agent = ScholarAgent(
                user_id=self.user.id,
                conversation_id='test-conv'
            )

            events = []
            async for event in agent.run("什么是导数", {}):
                events.append(event)

            event_types = [e['type'] for e in events]
            self.assertIn('action', event_types)
            self.assertIn('answer', event_types)