"""
工具管理器 / Tool Manager

提供工具执行、权限验证、结果处理等功能
Provides tool execution, permission validation, result processing functionality
"""

import json
import asyncio
from typing import Dict, Any, List, Optional, Union
from datetime import datetime
from django.contrib.auth import get_user_model

from .base import BaseTool, ToolResult, Language
from .registry import ToolRegistry

User = get_user_model()


class ToolManager:
    """工具管理器 / Tool manager"""

    def __init__(self, user_id: str, language: Language = Language.CHINESE):
        """
        初始化工具管理器 / Initialize tool manager

        Args:
            user_id: 用户ID / User ID
            language: 语言偏好 / Language preference
        """
        self.user_id = user_id
        self.language = language
        self.execution_history: List[Dict[str, Any]] = []
        self._tools_cache = ToolRegistry.get_all()

    async def execute_tool(self, tool_name: str, parameters: Dict[str, Any],
                          record_execution: bool = True) -> ToolResult:
        """
        执行工具 / Execute tool

        Args:
            tool_name: 工具名称 / Tool name
            parameters: 工具参数 / Tool parameters
            record_execution: 是否记录执行历史 / Whether to record execution history

        Returns:
            ToolResult: 执行结果 / Execution result
        """
        execution_start = datetime.now()

        try:
            # 获取工具
            tool = ToolRegistry.get(tool_name)
            if not tool:
                return ToolResult(
                    success=False,
                    error=f"Tool '{tool_name}' not found",
                    tool_name=tool_name,
                    message_zh=f"工具 '{tool_name}' 不存在",
                    message_en=f"Tool '{tool_name}' not found"
                )

            # 验证权限
            permission_result = await self._verify_permissions(tool, parameters)
            if not permission_result.success:
                return permission_result

            # 自动添加用户ID到参数中
            if 'user_id' not in parameters:
                parameters['user_id'] = self.user_id

            # 执行工具
            result = await tool.safe_execute(**parameters)

            # 记录执行历史
            if record_execution:
                await self._record_execution(tool_name, parameters, result, execution_start)

            # 后处理结果
            result = await self._post_process_result(tool, result)

            return result

        except Exception as e:
            error_result = ToolResult(
                success=False,
                error=str(e),
                tool_name=tool_name,
                execution_time=(datetime.now() - execution_start).total_seconds(),
                message_zh=f"工具执行异常: {str(e)}",
                message_en=f"Tool execution exception: {str(e)}"
            )

            if record_execution:
                await self._record_execution(tool_name, parameters, error_result, execution_start)

            return error_result

    async def execute_multiple_tools(self, tool_calls: List[Dict[str, Any]],
                                   parallel: bool = False) -> List[ToolResult]:
        """
        执行多个工具 / Execute multiple tools

        Args:
            tool_calls: 工具调用列表 / List of tool calls
            parallel: 是否并行执行 / Whether to execute in parallel

        Returns:
            List[ToolResult]: 执行结果列表 / List of execution results
        """
        if parallel:
            # 并行执行
            tasks = [
                self.execute_tool(
                    call["tool_name"],
                    call.get("parameters", {}),
                    call.get("record_execution", True)
                )
                for call in tool_calls
            ]
            return await asyncio.gather(*tasks, return_exceptions=True)
        else:
            # 串行执行
            results = []
            for call in tool_calls:
                result = await self.execute_tool(
                    call["tool_name"],
                    call.get("parameters", {}),
                    call.get("record_execution", True)
                )
                results.append(result)

                # 如果前一个工具失败且配置为停止执行，则中断
                if not result.success and call.get("stop_on_failure", False):
                    break

            return results

    async def verify_tool_parameters(self, tool_name: str, parameters: Dict[str, Any]) -> ToolResult:
        """
        验证工具参数 / Verify tool parameters

        Args:
            tool_name: 工具名称 / Tool name
            parameters: 参数字典 / Parameter dictionary

        Returns:
            ToolResult: 验证结果 / Validation result
        """
        return ToolRegistry.validate_tool_input(tool_name, parameters)

    def get_available_tools(self, category: Optional[str] = None) -> Dict[str, BaseTool]:
        """
        获取可用工具 / Get available tools

        Args:
            category: 工具类别（可选） / Tool category (optional)

        Returns:
            Dict[str, BaseTool]: 可用工具字典 / Available tools dictionary
        """
        if category:
            return ToolRegistry.get_by_category(category)
        return ToolRegistry.get_all()

    def get_tool_descriptions(self, format_type: str = "text") -> str:
        """
        获取工具描述 / Get tool descriptions

        Args:
            format_type: 格式类型 / Format type

        Returns:
            str: 工具描述文本 / Tool description text
        """
        if format_type == "text":
            return ToolRegistry.get_tool_descriptions(self.language)
        elif format_type == "json":
            schemas = ToolRegistry.get_all_schemas(self.language)
            return json.dumps(schemas, ensure_ascii=False, indent=2)
        else:
            return ToolRegistry.get_tool_descriptions(self.language)

    def search_tools(self, query: str) -> List[str]:
        """
        搜索工具 / Search tools

        Args:
            query: 搜索关键词 / Search query

        Returns:
            List[str]: 匹配的工具名称 / Matching tool names
        """
        return ToolRegistry.search_tools(query, self.language)

    async def get_execution_history(self, limit: int = 50) -> List[Dict[str, Any]]:
        """
        获取执行历史 / Get execution history

        Args:
            limit: 返回记录数限制 / Limit on number of records

        Returns:
            List[Dict]: 执行历史列表 / Execution history list
        """
        return self.execution_history[-limit:]

    async def clear_execution_history(self) -> None:
        """清空执行历史 / Clear execution history"""
        self.execution_history.clear()

    async def _verify_permissions(self, tool: BaseTool, parameters: Dict[str, Any]) -> ToolResult:
        """
        验证工具执行权限 / Verify tool execution permissions

        Args:
            tool: 工具实例 / Tool instance
            parameters: 参数字典 / Parameter dictionary

        Returns:
            ToolResult: 权限验证结果 / Permission verification result
        """
        # 验证用户是否存在
        try:
            user = await User.objects.aget(id=self.user_id)
            if not user.is_active:
                return ToolResult(
                    success=False,
                    error="User account is not active",
                    tool_name=tool.name,
                    message_zh="用户账户未激活",
                    message_en="User account is not active"
                )
        except User.DoesNotExist:
            return ToolResult(
                success=False,
                error="User not found",
                tool_name=tool.name,
                message_zh="用户不存在",
                message_en="User not found"
            )

        # 这里可以添加更多权限检查逻辑
        # 例如：检查用户是否有访问特定文档的权限等

        return ToolResult(success=True, tool_name=tool.name)

    async def _record_execution(self, tool_name: str, parameters: Dict[str, Any],
                               result: ToolResult, start_time: datetime) -> None:
        """
        记录工具执行 / Record tool execution

        Args:
            tool_name: 工具名称 / Tool name
            parameters: 参数字典 / Parameter dictionary
            result: 执行结果 / Execution result
            start_time: 开始时间 / Start time
        """
        execution_record = {
            "timestamp": start_time.isoformat(),
            "tool_name": tool_name,
            "parameters": parameters,
            "success": result.success,
            "execution_time": result.execution_time,
            "error": result.error
        }

        self.execution_history.append(execution_record)

        # 限制历史记录数量
        if len(self.execution_history) > 1000:
            self.execution_history = self.execution_history[-500:]

    async def _post_process_result(self, tool: BaseTool, result: ToolResult) -> ToolResult:
        """
        后处理执行结果 / Post-process execution result

        Args:
            tool: 工具实例 / Tool instance
            result: 原始结果 / Original result

        Returns:
            ToolResult: 处理后的结果 / Processed result
        """
        # 根据工具类型进行特定后处理
        if tool.category == "knowledge":
            # 知识工具可能需要更新记忆
            pass
        elif tool.category == "search":
            # 搜索工具可能需要记录搜索历史
            pass
        elif tool.category == "analysis":
            # 分析工具可能需要缓存结果
            pass

        # 确保有合适的消息
        if not result.get_message(self.language):
            if result.success:
                result.message_zh = "工具执行成功"
                result.message_en = "Tool executed successfully"
            else:
                result.message_zh = f"工具执行失败: {result.error}"
                result.message_en = f"Tool execution failed: {result.error}"

        return result

    def get_statistics(self) -> Dict[str, Any]:
        """
        获取工具使用统计 / Get tool usage statistics

        Returns:
            Dict[str, Any]: 统计信息 / Statistics
        """
        if not self.execution_history:
            return {"total_executions": 0}

        total_executions = len(self.execution_history)
        successful_executions = sum(1 for record in self.execution_history if record["success"])
        failed_executions = total_executions - successful_executions

        # 按工具统计
        tool_usage = {}
        for record in self.execution_history:
            tool_name = record["tool_name"]
            if tool_name not in tool_usage:
                tool_usage[tool_name] = {"total": 0, "success": 0, "failed": 0}
            tool_usage[tool_name]["total"] += 1
            if record["success"]:
                tool_usage[tool_name]["success"] += 1
            else:
                tool_usage[tool_name]["failed"] += 1

        # 平均执行时间
        total_time = sum(record["execution_time"] for record in self.execution_history)
        avg_execution_time = total_time / total_executions if total_executions > 0 else 0

        return {
            "total_executions": total_executions,
            "successful_executions": successful_executions,
            "failed_executions": failed_executions,
            "success_rate": successful_executions / total_executions if total_executions > 0 else 0,
            "average_execution_time": avg_execution_time,
            "tool_usage": tool_usage,
            "language": self.language.value
        }


class ToolChain:
    """工具链 / Tool chain"""

    def __init__(self, manager: ToolManager):
        """
        初始化工具链 / Initialize tool chain

        Args:
            manager: 工具管理器实例 / Tool manager instance
        """
        self.manager = manager
        self.chain: List[Dict[str, Any]] = []

    def add_step(self, tool_name: str, parameters: Dict[str, Any],
                 condition: Optional[str] = None,
                 depends_on: Optional[List[int]] = None) -> 'ToolChain':
        """
        添加工具执行步骤 / Add tool execution step

        Args:
            tool_name: 工具名称 / Tool name
            parameters: 参数字典 / Parameter dictionary
            condition: 执行条件（可选） / Execution condition (optional)
            depends_on: 依赖的步骤索引（可选） / Dependent step indices (optional)

        Returns:
            ToolChain: 工具链实例 / Tool chain instance
        """
        step = {
            "tool_name": tool_name,
            "parameters": parameters,
            "condition": condition,
            "depends_on": depends_on or [],
            "step_index": len(self.chain)
        }
        self.chain.append(step)
        return self

    async def execute(self) -> List[ToolResult]:
        """
        执行工具链 / Execute tool chain

        Returns:
            List[ToolResult]: 执行结果列表 / List of execution results
        """
        results = []
        executed_steps = set()

        for step in self.chain:
            # 检查依赖条件
            if step["depends_on"]:
                dependencies_met = all(
                    i in executed_steps and results[i].success
                    for i in step["depends_on"]
                )
                if not dependencies_met:
                    results.append(ToolResult(
                        success=False,
                        error=f"Dependencies not met for step {step['step_index']}",
                        tool_name=step["tool_name"],
                        message_zh=f"步骤 {step['step_index']} 的依赖条件未满足",
                        message_en=f"Dependencies not met for step {step['step_index']}"
                    ))
                    continue

            # 执行步骤
            result = await self.manager.execute_tool(
                step["tool_name"],
                step["parameters"]
            )
            results.append(result)
            executed_steps.add(step["step_index"])

        return results

    def get_chain_description(self) -> str:
        """获取工具链描述 / Get tool chain description"""
        description = "工具链执行步骤：\n"
        for i, step in enumerate(self.chain):
            deps = f" (依赖: {step['depends_on']})" if step["depends_on"] else ""
            condition = f" (条件: {step['condition']})" if step["condition"] else ""
            description += f"{i+1}. {step['tool_name']}{deps}{condition}\n"
        return description