"""
工具注册表 / Tool Registry

管理所有 Agent 工具的注册、查找和描述生成
Manages registration, lookup, and description generation for all Agent tools
"""

from typing import Dict, List, Type, Optional, Any
from .base import BaseTool, ToolResult, Language


class ToolRegistry:
    """工具注册表 / Tool registry"""

    _tools: Dict[str, BaseTool] = {}
    _categories: Dict[str, List[str]] = {}

    @classmethod
    def register(cls, tool_class: Type[BaseTool]) -> Type[BaseTool]:
        """
        装饰器：注册工具类 / Decorator: Register tool class

        Args:
            tool_class: 工具类 / Tool class

        Returns:
            Type[BaseTool]: 工具类 / Tool class
        """
        try:
            tool_instance = tool_class()
            tool_name = tool_instance.name

            # 检查是否已存在
            if tool_name in cls._tools:
                print(f"Warning: Tool '{tool_name}' already registered, overwriting")

            # 注册工具
            cls._tools[tool_name] = tool_instance

            # 按类别组织
            category = tool_instance.category
            if category not in cls._categories:
                cls._categories[category] = []
            if tool_name not in cls._categories[category]:
                cls._categories[category].append(tool_name)

        except Exception as e:
            print(f"Error registering tool {tool_class.__name__}: {str(e)}")
            raise

        return tool_class

    @classmethod
    def get(cls, name: str) -> Optional[BaseTool]:
        """
        获取工具实例 / Get tool instance

        Args:
            name: 工具名称 / Tool name

        Returns:
            Optional[BaseTool]: 工具实例或 None / Tool instance or None
        """
        return cls._tools.get(name)

    @classmethod
    def get_all(cls) -> Dict[str, BaseTool]:
        """
        获取所有工具 / Get all tools

        Returns:
            Dict[str, BaseTool]: 所有工具的字典 / Dictionary of all tools
        """
        return cls._tools.copy()

    @classmethod
    def get_by_category(cls, category: str) -> Dict[str, BaseTool]:
        """
        按类别获取工具 / Get tools by category

        Args:
            category: 工具类别 / Tool category

        Returns:
            Dict[str, BaseTool]: 该类别的工具 / Tools in that category
        """
        if category not in cls._categories:
            return {}

        tool_names = cls._categories[category]
        return {name: cls._tools[name] for name in tool_names if name in cls._tools}

    @classmethod
    def get_categories(cls) -> Dict[str, List[str]]:
        """
        获取所有类别 / Get all categories

        Returns:
            Dict[str, List[str]]: 类别及其工具 / Categories and their tools
        """
        return cls._categories.copy()

    @classmethod
    def list_tool_names(cls) -> List[str]:
        """
        列出所有工具名称 / List all tool names

        Returns:
            List[str]: 工具名称列表 / List of tool names
        """
        return list(cls._tools.keys())

    @classmethod
    def get_tool_descriptions(cls, language: Language = Language.CHINESE) -> str:
        """
        生成工具描述文本（用于 Prompt）
        Generate tool descriptions text (for prompts)

        Args:
            language: 语言偏好 / Language preference

        Returns:
            str: 格式化的工具描述 / Formatted tool descriptions
        """
        if language == Language.CHINESE:
            return cls._get_descriptions_zh()
        else:
            return cls._get_descriptions_en()

    @classmethod
    def _get_descriptions_zh(cls) -> str:
        """生成中文描述 / Generate Chinese descriptions"""
        descriptions = []
        descriptions.append("可用工具列表：\n")

        for category, tool_names in cls._categories.items():
            if not tool_names:
                continue

            category_names = {
                'search': '🔍 搜索工具',
                'analysis': '📊 分析工具',
                'knowledge': '📚 知识管理工具',
                'general': '🛠️ 通用工具'
            }
            descriptions.append(f"\n{category_names.get(category, f'📦 {category}')}:")
            descriptions.append("-" * 40)

            for tool_name in tool_names:
                if tool_name in cls._tools:
                    tool = cls._tools[tool_name]
                    descriptions.append(f"• {tool_name}: {tool.description_zh}")

                    # 添加参数信息
                    if tool.parameters and tool.parameters.get('properties'):
                        required = tool.parameters.get('required', [])
                        for param, spec in tool.parameters['properties'].items():
                            param_type = spec.get('type', 'string')
                            param_desc = spec.get('description_zh', spec.get('description', ''))
                            req_mark = " (必需)" if param in required else " (可选)"
                            descriptions.append(f"  - {param}: {param_type}{req_mark} - {param_desc}")

        descriptions.append("\n" + "=" * 50)
        return "\n".join(descriptions)

    @classmethod
    def _get_descriptions_en(cls) -> str:
        """生成英文描述 / Generate English descriptions"""
        descriptions = []
        descriptions.append("Available tools:\n")

        for category, tool_names in cls._categories.items():
            if not tool_names:
                continue

            category_names = {
                'search': '🔍 Search Tools',
                'analysis': '📊 Analysis Tools',
                'knowledge': '📚 Knowledge Management Tools',
                'general': '🛠️ General Tools'
            }
            descriptions.append(f"\n{category_names.get(category, f'📦 {category.title()}')}:")
            descriptions.append("-" * 40)

            for tool_name in tool_names:
                if tool_name in cls._tools:
                    tool = cls._tools[tool_name]
                    descriptions.append(f"• {tool_name}: {tool.description_en}")

                    # Add parameter information
                    if tool.parameters and tool.parameters.get('properties'):
                        required = tool.parameters.get('required', [])
                        for param, spec in tool.parameters['properties'].items():
                            param_type = spec.get('type', 'string')
                            param_desc = spec.get('description_en', spec.get('description', ''))
                            req_mark = " (required)" if param in required else " (optional)"
                            descriptions.append(f"  - {param}: {param_type}{req_mark} - {param_desc}")

        descriptions.append("\n" + "=" * 50)
        return "\n".join(descriptions)

    @classmethod
    def get_tool_schema(cls, name: str, language: Language = Language.CHINESE) -> Optional[Dict[str, Any]]:
        """
        获取单个工具的模式 / Get schema for a single tool

        Args:
            name: 工具名称 / Tool name
            language: 语言偏好 / Language preference

        Returns:
            Optional[Dict]: 工具模式或 None / Tool schema or None
        """
        tool = cls.get(name)
        if tool:
            return tool.get_schema(language)
        return None

    @classmethod
    def get_all_schemas(cls, language: Language = Language.CHINESE) -> List[Dict[str, Any]]:
        """
        获取所有工具的模式 / Get schemas for all tools

        Args:
            language: 语言偏好 / Language preference

        Returns:
            List[Dict]: 所有工具模式的列表 / List of all tool schemas
        """
        schemas = []
        for tool in cls._tools.values():
            schemas.append(tool.get_schema(language))
        return schemas

    @classmethod
    def validate_tool_input(cls, tool_name: str, input_data: Dict[str, Any]) -> ToolResult:
        """
        验证工具输入 / Validate tool input

        Args:
            tool_name: 工具名称 / Tool name
            input_data: 输入数据 / Input data

        Returns:
            ToolResult: 验证结果 / Validation result
        """
        tool = cls.get(tool_name)
        if not tool:
            return ToolResult(
                success=False,
                error=f"Tool '{tool_name}' not found",
                message_zh=f"工具 '{tool_name}' 不存在",
                message_en=f"Tool '{tool_name}' not found"
            )

        return tool._validate_parameters(input_data)

    @classmethod
    def search_tools(cls, query: str, language: Language = Language.CHINESE) -> List[str]:
        """
        搜索工具 / Search tools

        Args:
            query: 搜索关键词 / Search query
            language: 语言偏好 / Language preference

        Returns:
            List[str]: 匹配的工具名称列表 / List of matching tool names
        """
        query = query.lower()
        matching_tools = []

        for tool_name, tool in cls._tools.items():
            # 搜索工具名称
            if query in tool_name.lower():
                matching_tools.append(tool_name)
                continue

            # 搜索描述
            description = tool.description_zh if language == Language.CHINESE else tool.description_en
            if query in description.lower():
                matching_tools.append(tool_name)
                continue

            # 搜索类别
            if query in tool.category.lower():
                matching_tools.append(tool_name)

        return matching_tools

    @classmethod
    def clear(cls) -> None:
        """清空注册表 / Clear registry (for testing)"""
        cls._tools.clear()
        cls._categories.clear()

    @classmethod
    def count(cls) -> int:
        """
        获取工具数量 / Get tool count

        Returns:
            int: 已注册的工具数量 / Number of registered tools
        """
        return len(cls._tools)

    @classmethod
    def get_stats(cls) -> Dict[str, Any]:
        """
        获取注册表统计信息 / Get registry statistics

        Returns:
            Dict[str, Any]: 统计信息 / Statistics
        """
        return {
            'total_tools': len(cls._tools),
            'categories': {
                category: len(tools) for category, tools in cls._categories.items()
            },
            'tools_by_category': cls._categories.copy()
        }