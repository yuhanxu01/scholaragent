"""
基础工具类 / Base Tool Classes

定义了所有 Agent 工具的基础接口和结果类型
Defines the base interface and result types for all Agent tools
"""

import asyncio
import time
import uuid
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any, Optional, Dict, List, Union
from enum import Enum


class Language(Enum):
    """支持的语言 / Supported languages"""
    CHINESE = "zh"
    ENGLISH = "en"


@dataclass
class ToolResult:
    """工具执行结果 / Tool execution result"""
    success: bool
    data: Any = None
    error: Optional[str] = None
    execution_time: float = 0.0
    tool_name: str = ""
    metadata: Dict[str, Any] = field(default_factory=dict)

    # 支持多语言消息 / Support multi-language messages
    message_zh: str = ""
    message_en: str = ""

    # 数据验证标志 / Data validation flag
    is_valid: bool = True
    validation_errors: List[str] = field(default_factory=list)

    def get_message(self, language: Language = Language.CHINESE) -> str:
        """根据语言获取消息 / Get message based on language"""
        if language == Language.CHINESE:
            return self.message_zh or self._get_default_message_zh()
        else:
            return self.message_en or self._get_default_message_en()

    def _get_default_message_zh(self) -> str:
        if self.success:
            return f"操作成功完成"
        else:
            return f"操作失败: {self.error or '未知错误'}"

    def _get_default_message_en(self) -> str:
        if self.success:
            return f"Operation completed successfully"
        else:
            return f"Operation failed: {self.error or 'Unknown error'}"

    def to_dict(self) -> Dict[str, Any]:
        """转换为字典格式 / Convert to dictionary format"""
        return {
            'success': self.success,
            'data': self.data,
            'error': self.error,
            'execution_time': self.execution_time,
            'tool_name': self.tool_name,
            'metadata': self.metadata,
            'message_zh': self.message_zh,
            'message_en': self.message_en,
            'is_valid': self.is_valid,
            'validation_errors': self.validation_errors
        }


class BaseTool(ABC):
    """工具基类 / Base tool class"""

    name: str = ""
    description_zh: str = ""  # 中文描述
    description_en: str = ""  # 英文描述
    category: str = "general"  # 工具类别

    # 参数定义 / Parameter definition
    parameters: Dict[str, Any] = {}
    required_parameters: List[str] = []

    # 工具配置 / Tool configuration
    timeout: float = 30.0  # 超时时间（秒）
    max_retries: int = 3   # 最大重试次数
    async_execution: bool = True  # 是否异步执行

    def __init__(self):
        """初始化工具 / Initialize tool"""
        if not self.name:
            raise ValueError("Tool name must be specified")

        # 自动从类名生成工具名（如果没有指定）
        if not self.name and hasattr(self, '__class__'):
            class_name = self.__class__.__name__
            if class_name.endswith('Tool'):
                self.name = class_name[:-4].lower()
            else:
                self.name = class_name.lower()

    @abstractmethod
    async def execute(self, **kwargs) -> ToolResult:
        """
        执行工具 / Execute tool

        Args:
            **kwargs: 工具输入参数 / Tool input parameters

        Returns:
            ToolResult: 执行结果 / Execution result
        """
        pass

    async def safe_execute(self, **kwargs) -> ToolResult:
        """
        安全执行工具（包含错误处理和超时控制）
        Safe execution with error handling and timeout control
        """
        start_time = time.time()
        tool_name = self.name

        # 验证参数 / Validate parameters
        validation_result = self._validate_parameters(kwargs)
        if not validation_result.is_valid:
            validation_result.execution_time = time.time() - start_time
            validation_result.tool_name = tool_name
            return validation_result

        try:
            # 执行工具（带超时控制）
            if self.async_execution:
                result = await asyncio.wait_for(
                    self.execute(**kwargs),
                    timeout=self.timeout
                )
            else:
                # 对于同步工具，在线程池中执行
                loop = asyncio.get_event_loop()
                result = await loop.run_in_executor(
                    None, self._sync_execute_wrapper, kwargs
                )

            # 设置元数据 / Set metadata
            result.execution_time = time.time() - start_time
            result.tool_name = tool_name
            result.metadata.update({
                'parameters_used': kwargs,
                'execution_timestamp': time.time()
            })

            return result

        except asyncio.TimeoutError:
            return ToolResult(
                success=False,
                error=f"Tool execution timeout after {self.timeout} seconds",
                execution_time=time.time() - start_time,
                tool_name=tool_name,
                message_zh=f"工具执行超时（{self.timeout}秒）",
                message_en=f"Tool execution timeout ({self.timeout}s)"
            )
        except Exception as e:
            return ToolResult(
                success=False,
                error=str(e),
                execution_time=time.time() - start_time,
                tool_name=tool_name,
                message_zh=f"工具执行出错: {str(e)}",
                message_en=f"Tool execution error: {str(e)}"
            )

    def _sync_execute_wrapper(self, kwargs: Dict[str, Any]) -> ToolResult:
        """同步执行包装器 / Sync execution wrapper"""
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            return loop.run_until_complete(self.execute(**kwargs))
        finally:
            loop.close()

    def _validate_parameters(self, parameters: Dict[str, Any]) -> ToolResult:
        """
        验证输入参数 / Validate input parameters

        Args:
            parameters: 输入参数 / Input parameters

        Returns:
            ToolResult: 验证结果 / Validation result
        """
        validation_errors = []

        # 检查必需参数 / Check required parameters
        for param in self.required_parameters:
            if param not in parameters or parameters[param] is None:
                validation_errors.append(f"Missing required parameter: {param}")

        # 检查参数类型 / Check parameter types
        param_types = self.parameters.get('properties', {})
        for param_name, param_value in parameters.items():
            if param_name in param_types:
                expected_type = param_types[param_name].get('type')
                if expected_type and not self._check_type(param_value, expected_type):
                    validation_errors.append(
                        f"Parameter '{param_name}' should be of type {expected_type}"
                    )

        if validation_errors:
            return ToolResult(
                success=False,
                error="Parameter validation failed",
                validation_errors=validation_errors,
                is_valid=False,
                message_zh="参数验证失败",
                message_en="Parameter validation failed"
            )

        return ToolResult(success=True, is_valid=True)

    def _check_type(self, value: Any, expected_type: str) -> bool:
        """检查值类型 / Check value type"""
        type_mapping = {
            'string': str,
            'integer': int,
            'number': (int, float),
            'boolean': bool,
            'array': list,
            'object': dict
        }

        expected_python_type = type_mapping.get(expected_type)
        if expected_python_type:
            return isinstance(value, expected_python_type)

        return True

    def get_schema(self, language: Language = Language.CHINESE) -> Dict[str, Any]:
        """
        获取工具模式 / Get tool schema

        Args:
            language: 语言偏好 / Language preference

        Returns:
            Dict: 工具模式 / Tool schema
        """
        description = self.description_zh if language == Language.CHINESE else self.description_en

        # 确保有完整的参数定义
        if 'properties' not in self.parameters:
            self.parameters['properties'] = {}
        if 'type' not in self.parameters:
            self.parameters['type'] = 'object'
        if 'required' not in self.parameters:
            self.parameters['required'] = self.required_parameters

        return {
            "name": self.name,
            "description": description,
            "category": self.category,
            "parameters": self.parameters,
            "timeout": self.timeout,
            "async_execution": self.async_execution
        }

    def __str__(self) -> str:
        """字符串表示 / String representation"""
        return f"{self.name}: {self.description_zh} / {self.description_en}"

    def __repr__(self) -> str:
        """详细字符串表示 / Detailed string representation"""
        return f"<{self.__class__.__name__}(name='{self.name}', category='{self.category}')>"