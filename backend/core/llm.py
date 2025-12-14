"""
DeepSeek API客户端，支持多个模型（deepseek-chat, deepseek-reasoner）和可配置端点。
"""
import os
import logging
from typing import Optional, Dict, Any, Union, List
from openai import OpenAI, AsyncOpenAI
from openai.types.chat import ChatCompletion
from django.conf import settings

logger = logging.getLogger(__name__)


class DeepSeekClient:
    """DeepSeek API客户端，封装OpenAI SDK"""

    DEFAULT_MODEL = "deepseek-chat"
    DEFAULT_BASE_URL = "https://api.deepseek.com"
    DEFAULT_MAX_TOKENS = 2000
    DEFAULT_TEMPERATURE = 0.7

    def __init__(
        self,
        api_key: Optional[str] = None,
        base_url: Optional[str] = None,
        default_model: Optional[str] = None,
        async_client: bool = True,
    ):
        """
        初始化DeepSeek客户端。

        Args:
            api_key: DeepSeek API密钥，如果为None则从环境变量DEEPSEEK_API_KEY读取
            base_url: API基础URL，如果为None则使用默认值
            default_model: 默认模型名称
            async_client: 是否使用异步客户端（默认True）
        """
        self.api_key = api_key or os.environ.get("DEEPSEEK_API_KEY")
        if not self.api_key:
            logger.warning("DEEPSEEK_API_KEY not set, LLM calls will fail")

        self.base_url = base_url or self.DEFAULT_BASE_URL
        self.default_model = default_model or self.DEFAULT_MODEL
        self.async_client = async_client

        # 初始化客户端
        if async_client:
            self.client = AsyncOpenAI(
                api_key=self.api_key,
                base_url=self.base_url,
            )
        else:
            self.client = OpenAI(
                api_key=self.api_key,
                base_url=self.base_url,
            )

    def is_configured(self) -> bool:
        """检查API是否正确配置"""
        return bool(self.api_key)

    def get_configuration_status(self) -> Dict[str, Any]:
        """获取配置状态信息"""
        return {
            'api_key_configured': self.is_configured(),
            'base_url': self.base_url,
            'default_model': self.default_model,
            'async_client': self.async_client
        }

    async def generate(
        self,
        prompt: str,
        system_prompt: str = "",
        model: Optional[str] = None,
        temperature: float = DEFAULT_TEMPERATURE,
        max_tokens: int = DEFAULT_MAX_TOKENS,
        response_format: str = "text",
        use_cache: bool = True,
        **kwargs,
    ) -> Dict[str, Any]:
        """
        生成文本完成。

        Args:
            prompt: 用户提示
            system_prompt: 系统提示（可选）
            model: 模型名称，如果为None则使用默认模型
            temperature: 温度（0-2）
            max_tokens: 最大生成token数
            response_format: 期望的响应格式，"text"或"json_object"
            **kwargs: 其他传递给OpenAI API的参数

        Returns:
            包含响应和元数据的字典，格式为：
            {
                "content": str,  # 生成的文本
                "model": str,    # 使用的模型
                "usage": dict,   # token使用情况
                "finish_reason": str,
            }

        Raises:
            Exception: 如果API调用失败
        """
        model = model or self.default_model

        # 检查缓存
        if use_cache:
            from .llm_cache import LLMCache
            cache_params = {
                "model": model,
                "temperature": temperature,
                "max_tokens": max_tokens,
                "response_format": response_format,
                "system_prompt": system_prompt,
                **kwargs
            }
            cached_response = LLMCache.get(prompt, cache_params)
            if cached_response:
                return {"content": cached_response, "cached": True}

        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})

        # 准备请求参数
        params = {
            "model": model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
            **kwargs,
        }

        if response_format == "json_object":
            params["response_format"] = {"type": "json_object"}

        try:
            if self.async_client:
                response: ChatCompletion = await self.client.chat.completions.create(**params)
            else:
                response: ChatCompletion = self.client.chat.completions.create(**params)

            choice = response.choices[0]
            result = {
                "content": choice.message.content or "",
                "model": response.model,
                "usage": {
                    "prompt_tokens": response.usage.prompt_tokens,
                    "completion_tokens": response.usage.completion_tokens,
                    "total_tokens": response.usage.total_tokens,
                },
                "finish_reason": choice.finish_reason,
            }

            # 缓存响应
            if use_cache and result.get("content"):
                from .llm_cache import LLMCache
                cache_params = {
                    "model": model,
                    "temperature": temperature,
                    "max_tokens": max_tokens,
                    "response_format": response_format,
                    "system_prompt": system_prompt,
                    **kwargs
                }
                LLMCache.set(prompt, result["content"], cache_params)

            logger.debug(f"LLM调用成功，模型={model}，token使用={result['usage']}")
            return result

        except Exception as e:
            logger.error(f"LLM调用失败: {e}")
            raise

    async def generate_json(
        self,
        prompt: str,
        system_prompt: str = "",
        model: Optional[str] = None,
        temperature: float = 0.2,
        max_tokens: int = 2000,
        **kwargs,
    ) -> Dict[str, Any]:
        """
        生成JSON格式的响应（方便解析）。

        Args:
            同generate，但response_format固定为"json_object"

        Returns:
            解析后的JSON字典

        Raises:
            ValueError: 如果响应不是有效的JSON
        """
        result = await self.generate(
            prompt=prompt,
            system_prompt=system_prompt,
            model=model,
            temperature=temperature,
            max_tokens=max_tokens,
            response_format="json_object",
            **kwargs,
        )
        import json
        try:
            return json.loads(result["content"])
        except json.JSONDecodeError as e:
            logger.error(f"无法解析LLM返回的JSON: {result['content']}")
            raise ValueError(f"Invalid JSON response: {e}")

    async def generate_stream(self, prompt: str, **kwargs):
        """
        流式生成（返回异步生成器）。

        Args:
            prompt: 用户提示
            **kwargs: 传递给generate的参数

        Yields:
            每个chunk的内容
        """
        model = kwargs.pop("model", self.default_model)
        messages = [{"role": "user", "content": prompt}]
        if "system_prompt" in kwargs:
            messages.insert(0, {"role": "system", "content": kwargs.pop("system_prompt")})

        params = {
            "model": model,
            "messages": messages,
            "stream": True,
            **kwargs,
        }

        if self.async_client:
            stream = await self.client.chat.completions.create(**params)
            async for chunk in stream:
                if chunk.choices[0].delta.content is not None:
                    yield chunk.choices[0].delta.content
        else:
            stream = self.client.chat.completions.create(**params)
            for chunk in stream:
                if chunk.choices[0].delta.content is not None:
                    yield chunk.choices[0].delta.content


# 全局单例客户端实例（懒加载）
_global_client: Optional[DeepSeekClient] = None


def get_llm_client() -> DeepSeekClient:
    """
    获取全局LLM客户端实例（单例）。
    配置从Django设置或环境变量读取。
    """
    global _global_client
    if _global_client is None:
        api_key = getattr(settings, "DEEPSEEK_API_KEY", None) or os.environ.get("DEEPSEEK_API_KEY")
        base_url = getattr(settings, "DEEPSEEK_BASE_URL", DeepSeekClient.DEFAULT_BASE_URL)
        default_model = getattr(settings, "DEEPSEEK_DEFAULT_MODEL", DeepSeekClient.DEFAULT_MODEL)
        _global_client = DeepSeekClient(
            api_key=api_key,
            base_url=base_url,
            default_model=default_model,
            async_client=True,
        )
    return _global_client


async def generate_index(content: str, **kwargs) -> Dict[str, Any]:
    """
    为文档内容生成索引的便捷函数。
    使用预定义的提示模板调用LLM生成摘要、概念、关键词等。

    Args:
        content: 文档内容（清洗后的文本）
        **kwargs: 传递给generate_json的参数

    Returns:
        索引字典，包含summary, concepts, keywords, difficulty等字段
    """
    from .prompts import INDEX_GENERATION_PROMPT  # 稍后实现

    prompt = INDEX_GENERATION_PROMPT.format(content=content)
    client = get_llm_client()
    return await client.generate_json(prompt=prompt, **kwargs)