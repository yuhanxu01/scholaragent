"""
工具系统测试 / Tool System Tests

测试工具注册、执行和功能
Tests tool registration, execution and functionality
"""

import asyncio
import pytest
from django.test import TestCase
from django.contrib.auth import get_user_model

from .base import BaseTool, ToolResult, Language
from .registry import ToolRegistry
from .search_tools import SearchConceptsTool
from .analysis_tools import AnalyzeFormulaTool
from .knowledge_tools import CreateNoteTool

User = get_user_model()


class MockTestTool(BaseTool):
    """测试工具 / Test tool"""
    name = "test_tool"
    category = "test"
    description_zh = "测试工具"
    description_en = "Test tool"

    parameters = {
        "type": "object",
        "properties": {
            "input": {"type": "string"},
            "number": {"type": "integer"}
        },
        "required": ["input"]
    }
    required_parameters = ["input"]

    async def execute(self, input: str, number: int = 1, **kwargs) -> ToolResult:
        return ToolResult(
            success=True,
            data={"output": input * number},
            message_zh="测试成功",
            message_en="Test successful"
        )


class TestToolRegistry(TestCase):
    """工具注册表测试 / Tool registry tests"""

    def setUp(self):
        """设置测试环境 / Set up test environment"""
        # 清空注册表
        ToolRegistry.clear()

    def test_tool_registration(self):
        """测试工具注册 / Test tool registration"""
        # 注册测试工具
        @ToolRegistry.register
        class TestTool(BaseTool):
            name = "test_registration"
            description_zh = "测试注册"
            description_en = "Test registration"

        # 验证注册成功
        tool = ToolRegistry.get("test_registration")
        self.assertIsNotNone(tool)
        self.assertEqual(tool.name, "test_registration")

    def test_get_all_tools(self):
        """测试获取所有工具 / Test getting all tools"""
        @ToolRegistry.register
        class Tool1(BaseTool):
            name = "tool1"

        @ToolRegistry.register
        class Tool2(BaseTool):
            name = "tool2"

        tools = ToolRegistry.get_all()
        self.assertEqual(len(tools), 2)
        self.assertIn("tool1", tools)
        self.assertIn("tool2", tools)

    def test_get_by_category(self):
        """测试按类别获取工具 / Test getting tools by category"""
        @ToolRegistry.register
        class SearchTool(BaseTool):
            name = "search_test"
            category = "search"

        @ToolRegistry.register
        class AnalysisTool(BaseTool):
            name = "analysis_test"
            category = "analysis"

        search_tools = ToolRegistry.get_by_category("search")
        analysis_tools = ToolRegistry.get_by_category("analysis")

        self.assertEqual(len(search_tools), 1)
        self.assertEqual(len(analysis_tools), 1)
        self.assertIn("search_test", search_tools)
        self.assertIn("analysis_test", analysis_tools)

    def test_tool_descriptions(self):
        """测试工具描述生成 / Test tool description generation"""
        @ToolRegistry.register
        class DescTool(BaseTool):
            name = "desc_test"
            category = "test"
            description_zh = "中文描述"
            description_en = "English description"

        zh_desc = ToolRegistry.get_tool_descriptions(Language.CHINESE)
        en_desc = ToolRegistry.get_tool_descriptions(Language.ENGLISH)

        self.assertIn("中文描述", zh_desc)
        self.assertIn("English description", en_desc)

    def test_validate_tool_input(self):
        """测试工具输入验证 / Test tool input validation"""
        @ToolRegistry.register
        class ValidTool(BaseTool):
            name = "valid_test"
            parameters = {
                "type": "object",
                "properties": {
                    "required_param": {"type": "string"},
                    "optional_param": {"type": "integer"}
                },
                "required": ["required_param"]
            }
            required_parameters = ["required_param"]

            async def execute(self, **kwargs):
                return ToolResult(success=True)

        # 测试有效输入
        valid_input = {"required_param": "test", "optional_param": 123}
        result = ToolRegistry.validate_tool_input("valid_test", valid_input)
        self.assertTrue(result.success)

        # 测试无效输入（缺少必需参数）
        invalid_input = {"optional_param": 123}
        result = ToolRegistry.validate_tool_input("valid_test", invalid_input)
        self.assertFalse(result.success)
        self.assertIn("Missing required parameter", result.error)


class TestBaseTool(TestCase):
    """基础工具类测试 / Base tool class tests"""

    def setUp(self):
        """设置测试环境 / Set up test environment"""
        self.tool = MockTestTool()

    def test_tool_initialization(self):
        """测试工具初始化 / Test tool initialization"""
        self.assertEqual(self.tool.name, "test_tool")
        self.assertEqual(self.tool.category, "test")

    def test_parameter_validation(self):
        """测试参数验证 / Test parameter validation"""
        # 有效参数
        valid_params = {"input": "hello", "number": 3}
        result = self.tool._validate_parameters(valid_params)
        self.assertTrue(result.is_valid)

        # 缺少必需参数
        invalid_params = {"number": 3}
        result = self.tool._validate_parameters(invalid_params)
        self.assertFalse(result.is_valid)

    def test_safe_execute(self):
        """测试安全执行 / Test safe execution"""
        async def run_test():
            result = await self.tool.safe_execute(input="test", number=2)
            self.assertTrue(result.success)
            self.assertEqual(result.data["output"], "testtest")
            self.assertGreater(result.execution_time, 0)

        asyncio.run(run_test())

    def test_get_schema(self):
        """测试获取模式 / Test getting schema"""
        schema = self.tool.get_schema(Language.CHINESE)
        self.assertEqual(schema["name"], "test_tool")
        self.assertEqual(schema["description"], "测试工具")
        self.assertIn("parameters", schema)

    def test_type_checking(self):
        """测试类型检查 / Test type checking"""
        self.assertTrue(self.tool._check_type("hello", "string"))
        self.assertTrue(self.tool._check_type(123, "integer"))
        self.assertTrue(self.tool._check_type(12.34, "number"))
        self.assertTrue(self.tool._check_type(True, "boolean"))
        self.assertTrue(self.tool._check_type([1, 2, 3], "array"))
        self.assertTrue(self.tool._check_type({"key": "value"}, "object"))

        self.assertFalse(self.tool._check_type(123, "string"))
        self.assertFalse(self.tool._check_type("hello", "integer"))


class TestToolResult(TestCase):
    """工具结果类测试 / Tool result class tests"""

    def test_successful_result(self):
        """测试成功结果 / Test successful result"""
        result = ToolResult(
            success=True,
            data={"key": "value"},
            message_zh="操作成功",
            message_en="Operation successful"
        )

        self.assertTrue(result.success)
        self.assertEqual(result.data["key"], "value")
        self.assertEqual(result.get_message(Language.CHINESE), "操作成功")
        self.assertEqual(result.get_message(Language.ENGLISH), "Operation successful")

    def test_failed_result(self):
        """测试失败结果 / Test failed result"""
        result = ToolResult(
            success=False,
            error="Something went wrong",
            message_zh="操作失败",
            message_en="Operation failed"
        )

        self.assertFalse(result.success)
        self.assertEqual(result.error, "Something went wrong")

    def test_default_messages(self):
        """测试默认消息 / Test default messages"""
        result = ToolResult(success=True)
        self.assertEqual(result.get_message(Language.CHINESE), "操作成功完成")
        self.assertEqual(result.get_message(Language.ENGLISH), "Operation completed successfully")

        result = ToolResult(success=False, error="Test error")
        self.assertIn("Test error", result.get_message(Language.CHINESE))
        self.assertIn("Test error", result.get_message(Language.ENGLISH))

    def test_to_dict(self):
        """测试转换为字典 / Test conversion to dict"""
        result = ToolResult(
            success=True,
            data={"test": "data"},
            tool_name="test_tool",
            metadata={"meta": "value"}
        )

        dict_result = result.to_dict()
        self.assertTrue(dict_result["success"])
        self.assertEqual(dict_result["data"]["test"], "data")
        self.assertEqual(dict_result["tool_name"], "test_tool")
        self.assertEqual(dict_result["metadata"]["meta"], "value")


class TestRealTools(TestCase):
    """真实工具测试 / Real tools tests"""

    def setUp(self):
        """设置测试环境 / Set up test environment"""
        self.user = User.objects.create_user(
            username="testuser",
            email="test@example.com",
            password="testpass123"
        )

    def test_search_concepts_tool(self):
        """测试概念搜索工具 / Test search concepts tool"""
        tool = SearchConceptsTool()
        self.assertEqual(tool.name, "search_concepts")
        self.assertEqual(tool.category, "search")
        self.assertIn("search_concepts", ToolRegistry.get_all())

    def test_analyze_formula_tool(self):
        """测试公式分析工具 / Test analyze formula tool"""
        tool = AnalyzeFormulaTool()
        self.assertEqual(tool.name, "analyze_formula")
        self.assertEqual(tool.category, "analysis")

        # 测试 LaTeX 验证
        self.assertTrue(tool._is_valid_latex("$x^2 + y^2 = r^2$"))
        self.assertTrue(tool._is_valid_latex("\\begin{equation}...\\end{equation}"))
        self.assertFalse(tool._is_valid_latex("not a formula"))
        self.assertFalse(tool._is_valid_latex(""))

    def test_create_note_tool(self):
        """测试创建笔记工具 / Test create note tool"""
        tool = CreateNoteTool()
        self.assertEqual(tool.name, "create_note")
        self.assertEqual(tool.category, "knowledge")

        async def test_note_creation():
            result = await tool.safe_execute(
                title="测试笔记",
                content="这是测试内容",
                tags=["test", "note"],
                user_id=str(self.user.id)
            )
            self.assertTrue(result.success)

        asyncio.run(test_note_creation())

    def test_tool_registry_stats(self):
        """测试工具注册表统计 / Test tool registry stats"""
        stats = ToolRegistry.get_stats()
        self.assertIn("total_tools", stats)
        self.assertIn("categories", stats)
        self.assertGreater(stats["total_tools"], 0)

    def test_search_tools_functionality(self):
        """测试工具搜索功能 / Test tool search functionality"""
        # 搜索已注册的工具
        results = ToolRegistry.search_tools("search")
        self.assertGreater(len(results), 0)
        self.assertTrue(any("search_concepts" in tool for tool in results))

        results = ToolRegistry.search_tools("formula")
        self.assertGreater(len(results), 0)
        self.assertTrue(any("analyze_formula" in tool for tool in results))

    def test_tool_timeout_simulation(self):
        """测试工具超时模拟 / Test tool timeout simulation"""
        class SlowTool(BaseTool):
            name = "slow_tool"
            timeout = 0.1  # 100ms

            async def execute(self, **kwargs):
                await asyncio.sleep(0.2)  # 模拟慢操作
                return ToolResult(success=True)

        tool = SlowTool()
        tool.timeout = 0.1  # 100ms

        async def test_timeout():
            result = await tool.safe_execute()
            self.assertFalse(result.success)
            self.assertIn("timeout", result.error.lower())

        asyncio.run(test_timeout())