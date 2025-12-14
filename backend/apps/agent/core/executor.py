"""
Agent 执行引擎 / Agent Execution Engine

实现ScholarMind Agent的核心执行逻辑，包括任务规划、ReAct循环和工具调用
"""

import logging
import json
import time
from typing import Dict, Any, AsyncGenerator, Optional
from datetime import datetime

from apps.agent.models import AgentTask, ToolCall, Conversation, Message
from apps.agent.tools.registry import ToolRegistry
from core.llm import get_llm_client
from core.logging import LoggerMixin, log_context
from apps.billing.services import TokenUsageService

from .memory import MemoryManager
from .prompts import SYSTEM_PROMPT, PLANNER_PROMPT, REACT_PROMPT

logger = logging.getLogger('agent')


class ScholarAgent(LoggerMixin):
    """ScholarMind Agent执行器 / ScholarMind Agent Executor"""

    MAX_ITERATIONS = 8  # 最大迭代次数 / Maximum iterations

    def __init__(self, user_id: str, conversation_id: str, document_id: Optional[str] = None):
        """
        初始化Agent执行器 / Initialize Agent executor

        Args:
            user_id: 用户ID / User ID
            conversation_id: 对话ID / Conversation ID
            document_id: 文档ID（可选） / Document ID (optional)
        """
        self.user_id = user_id
        self.conversation_id = conversation_id
        self.document_id = document_id

        self.memory = MemoryManager(user_id, conversation_id)
        self.execution_history = []
        self.llm_client = get_llm_client()

    async def run(self, user_input: str, context: dict) -> AsyncGenerator[Dict[str, Any], None]:
        """
        主执行循环 / Main execution loop

        Args:
            user_input: 用户输入 / User input
            context: 上下文信息 / Context information

        Yields:
            Dict: 执行事件 / Execution events
        """
        with log_context(logger, 'agent_execution',
                        user_id=self.user_id,
                        conversation_id=self.conversation_id):
            start_time = time.time()
            task = None

            try:
                # 1. 创建任务记录 / Create task record
                task = await AgentTask.objects.acreate(
                    conversation_id=self.conversation_id,
                    message_id=context.get('message_id'),
                    status='planning'
                )

                # 2. 获取记忆上下文 / Get memory context
                yield {"type": "state", "data": {"state": "loading_memory"}}
                memory_context = await self.memory.get_context(user_input)

                # 3. 规划阶段 / Planning phase
                yield {"type": "state", "data": {"state": "planning"}}
                logger.info(f'Planning for query: {user_input[:100]}...')
                plan = await self._create_plan(user_input, memory_context, context)
                logger.info(f'Plan created with {len(plan.get("plan", []))} steps')

                # 更新任务状态 / Update task status
                task.plan = plan
                task.status = 'executing'
                await task.asave()

                yield {"type": "plan", "data": plan}

                # 4. 如果不需要工具，直接回答 / Direct answer if no tools needed
                if not plan.get("needs_tools", False):
                    answer = await self._direct_answer(user_input, memory_context)
                    yield {"type": "answer", "data": {"content": answer}}

                    # 更新任务完成状态 / Update task completion status
                    task.status = 'completed'
                    task.result = answer
                    task.execution_time = time.time() - start_time
                    await task.asave()

                    return

                # 5. ReAct循环 / ReAct loop
                for iteration in range(self.MAX_ITERATIONS):
                    logger.debug(f'Iteration {iteration+1}/{self.MAX_ITERATIONS}')
                    yield {"type": "iteration", "data": {"current": iteration + 1, "max": self.MAX_ITERATIONS}}

                    # 思考阶段 / Thinking phase
                    thought = await self._think(user_input, memory_context, context, plan)
                    yield {"type": "thought", "data": {"content": thought.get("thought", "")}}

                    # 检查是否需要工具 / Check if tool is needed
                    if "action" in thought:
                        # 执行工具 / Execute tool
                        logger.info(f'Executing tool: {thought["action"]}')
                        yield {"type": "action", "data": {"tool": thought["action"]}}

                        tool_result = await self._execute_tool(
                            thought["action"],
                            thought.get("action_input", {}),
                            task
                        )

                        yield {"type": "observation", "data": {
                            "content": str(tool_result)[:500],  # 限制长度 / Limit length
                            "success": tool_result.get("success", False)
                        }}

                        # 记录执行历史 / Record execution history
                        self.execution_history.append({
                            "thought": thought["thought"],
                            "action": thought["action"],
                            "observation": tool_result
                        })

                    elif "final_answer" in thought:
                        # 给出最终答案 / Give final answer
                        logger.info(f'Answer generated after {iteration+1} iterations')
                        yield {"type": "answer", "data": {"content": thought["final_answer"]}}

                        # 更新任务完成状态 / Update task completion status
                        task.status = 'completed'
                        task.result = thought["final_answer"]
                        task.iterations = iteration + 1
                        task.execution_time = time.time() - start_time
                        task.execution_history = self.execution_history
                        await task.asave()

                        # 压缩并保存会话 / Compress and save session
                        await self.memory.compress_and_save_session(self.execution_history)

                        logger.info(f'Agent execution completed')
                        return

                # 达到最大迭代次数 / Reached maximum iterations
                yield {"type": "error", "data": {"message": "达到最大思考次数，请简化问题或提供更多信息"}}

                task.status = 'failed'
                task.error_message = "达到最大迭代次数"
                task.iterations = self.MAX_ITERATIONS
                task.execution_time = time.time() - start_time
                await task.asave()

            except Exception as e:
                logger.error(f"Agent执行失败: {e}")

                # 更新任务失败状态 / Update task failure status
                if task:
                    task.status = 'failed'
                    task.error_message = str(e)
                    task.execution_time = time.time() - start_time
                    await task.asave()

                yield {"type": "error", "data": {"message": f"执行失败: {str(e)}"}}

    async def _create_plan(self, user_input: str, memory_context: Dict[str, Any], context: Dict[str, Any]) -> Dict[str, Any]:
        """
        创建执行计划 / Create execution plan

        Args:
            user_input: 用户输入 / User input
            memory_context: 记忆上下文 / Memory context
            context: 执行上下文 / Execution context

        Returns:
            Dict: 执行计划 / Execution plan
        """
        try:
            # 准备规划提示词 / Prepare planning prompt
            tools_description = ToolRegistry.get_tool_descriptions()

            document_info = context.get('document_info', {})
            selection = context.get('selection', '')

            prompt = PLANNER_PROMPT.format(
                user_input=user_input,
                document_info=json.dumps(document_info, ensure_ascii=False),
                selection=selection,
                tools_description=tools_description
            )

            # 调用LLM生成计划 / Call LLM to generate plan
            response = await self.llm_client.generate_json(prompt=prompt)

            # 记录token使用 / Record token usage
            if 'usage' in response:
                usage = response['usage']
                input_tokens = usage.get('prompt_tokens', 0)
                output_tokens = usage.get('completion_tokens', 0)
                if input_tokens > 0 or output_tokens > 0:
                    from django.contrib.auth import get_user_model
                    User = get_user_model()
                    try:
                        user = await User.objects.aget(id=self.user_id)
                        await TokenUsageService.record_token_usage(
                            user=user,
                            input_tokens=input_tokens,
                            output_tokens=output_tokens,
                            api_type='agent_execution',
                            metadata={
                                'operation': 'create_plan',
                                'conversation_id': self.conversation_id,
                                'document_id': self.document_id
                            }
                        )
                    except Exception as e:
                        logger.warning(f"Failed to record token usage for plan creation: {e}")

            return response

        except Exception as e:
            logger.error(f"创建计划失败: {e}")
            # 返回默认计划 / Return default plan
            return {
                "intent": "无法分析用户意图",
                "needs_tools": False,
                "plan": ["直接回答用户问题"],
                "estimated_tools": []
            }

    async def _direct_answer(self, user_input: str, memory_context: Dict[str, Any]) -> str:
        """
        直接回答（不需要工具） / Direct answer (no tools needed)

        Args:
            user_input: 用户输入 / User input
            memory_context: 记忆上下文 / Memory context

        Returns:
            str: 回答内容 / Answer content
        """
        try:
            # 准备系统提示词 / Prepare system prompt
            user_profile = memory_context.get('user_profile', {})
            system_prompt = SYSTEM_PROMPT.format(user_profile=json.dumps(user_profile, ensure_ascii=False))

            # 调用LLM生成回答 / Call LLM to generate answer
            response = await self.llm_client.generate(
                prompt=user_input,
                system_prompt=system_prompt,
                max_tokens=1000
            )

            # 记录token使用 / Record token usage
            if 'usage' in response:
                usage = response['usage']
                input_tokens = usage.get('prompt_tokens', 0)
                output_tokens = usage.get('completion_tokens', 0)
                if input_tokens > 0 or output_tokens > 0:
                    from django.contrib.auth import get_user_model
                    User = get_user_model()
                    try:
                        user = await User.objects.aget(id=self.user_id)
                        await TokenUsageService.record_token_usage(
                            user=user,
                            input_tokens=input_tokens,
                            output_tokens=output_tokens,
                            api_type='agent_execution',
                            metadata={
                                'operation': 'direct_answer',
                                'conversation_id': self.conversation_id,
                                'document_id': self.document_id
                            }
                        )
                    except Exception as e:
                        logger.warning(f"Failed to record token usage for direct answer: {e}")

            return response["content"]

        except Exception as e:
            logger.error(f"直接回答失败: {e}")
            return "抱歉，我现在无法回答您的问题。请稍后再试。"

    async def _think(self, user_input: str, memory_context: Dict[str, Any],
                    context: Dict[str, Any], plan: Dict[str, Any]) -> Dict[str, Any]:
        """
        思考步骤（ReAct中的Thought） / Thinking step (Thought in ReAct)

        Args:
            user_input: 用户输入 / User input
            memory_context: 记忆上下文 / Memory context
            context: 执行上下文 / Execution context
            plan: 执行计划 / Execution plan

        Returns:
            Dict: 思考结果 / Thinking result
        """
        try:
            # 准备ReAct提示词 / Prepare ReAct prompt
            tools_description = ToolRegistry.get_tool_descriptions()

            execution_history_text = "\n".join([
                f"Thought: {step['thought']}\nAction: {step['action']}\nObservation: {step['observation']}"
                for step in self.execution_history[-3:]  # 最近3步 / Last 3 steps
            ])

            prompt = REACT_PROMPT.format(
                user_input=user_input,
                plan=json.dumps(plan, ensure_ascii=False),
                execution_history=execution_history_text,
                tools_description=tools_description
            )

            # 调用LLM生成思考 / Call LLM to generate thought
            response = await self.llm_client.generate_json(prompt=prompt)

            # 记录token使用 / Record token usage
            if 'usage' in response:
                usage = response['usage']
                input_tokens = usage.get('prompt_tokens', 0)
                output_tokens = usage.get('completion_tokens', 0)
                if input_tokens > 0 or output_tokens > 0:
                    from django.contrib.auth import get_user_model
                    User = get_user_model()
                    try:
                        user = await User.objects.aget(id=self.user_id)
                        await TokenUsageService.record_token_usage(
                            user=user,
                            input_tokens=input_tokens,
                            output_tokens=output_tokens,
                            api_type='agent_execution',
                            metadata={
                                'operation': 'think',
                                'conversation_id': self.conversation_id,
                                'document_id': self.document_id,
                                'iteration': len(self.execution_history) + 1
                            }
                        )
                    except Exception as e:
                        logger.warning(f"Failed to record token usage for thinking: {e}")

            return response

        except Exception as e:
            logger.error(f"思考步骤失败: {e}")
            # 返回默认思考结果 / Return default thinking result
            return {
                "thought": "无法生成有效的思考步骤",
                "final_answer": "抱歉，我遇到了一些问题。请重新表述您的问题。"
            }

    async def _execute_tool(self, tool_name: str, tool_input: Dict[str, Any], task: AgentTask) -> Dict[str, Any]:
        """
        执行工具 / Execute tool

        Args:
            tool_name: 工具名称 / Tool name
            tool_input: 工具输入 / Tool input
            task: 任务对象 / Task object

        Returns:
            Dict: 工具执行结果 / Tool execution result
        """
        start_time = time.time()

        try:
            # 创建工具调用记录 / Create tool call record
            tool_call = await ToolCall.objects.acreate(
                task=task,
                tool_name=tool_name,
                tool_input=tool_input,
                status='running'
            )

            # 获取工具 / Get tool
            tool = ToolRegistry.get(tool_name)
            if not tool:
                error_msg = f"工具不存在: {tool_name}"
                await tool_call.asave(update_fields=['status', 'error', 'execution_time'])
                tool_call.status = 'failed'
                tool_call.error = error_msg
                tool_call.execution_time = time.time() - start_time
                await tool_call.asave()
                return {"success": False, "error": error_msg}

            # 执行工具 / Execute tool
            tool_input["user_id"] = self.user_id
            result = await tool.safe_execute(**tool_input)

            # 更新工具调用记录 / Update tool call record
            tool_call.status = 'success' if result.success else 'failed'
            tool_call.output = result.data if result.success else ""
            tool_call.error = result.error if not result.success else ""
            tool_call.execution_time = time.time() - start_time
            await tool_call.asave()

            return {
                "success": result.success,
                "data": result.data,
                "error": result.error,
                "execution_time": result.execution_time
            }

        except Exception as e:
            logger.error(f"工具执行失败: {e}")

            # 更新工具调用记录 / Update tool call record
            if 'tool_call' in locals():
                tool_call.status = 'failed'
                tool_call.error = str(e)
                tool_call.execution_time = time.time() - start_time
                await tool_call.asave()

            return {
                "success": False,
                "error": str(e),
                "execution_time": time.time() - start_time
            }