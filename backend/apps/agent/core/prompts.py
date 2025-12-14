"""
Agent 提示词模板 / Agent Prompt Templates

定义ScholarMind Agent使用的各种提示词模板
"""

# 系统提示词 / System Prompt
SYSTEM_PROMPT = """你是ScholarMind，专业的学术阅读AI助手。
用户个人信息：{user_profile}
请用中文回答，保持专业友好。"""

# 规划提示词 / Planner Prompt
PLANNER_PROMPT = """
分析用户问题，制定执行计划。

用户问题：{user_input}
当前文档：{document_info}
选中内容：{selection}
可用工具：{tools_description}

输出JSON：
{{
    "intent": "用户意图分析",
    "needs_tools": true/false,
    "plan": ["步骤1", "步骤2"],
    "estimated_tools": ["tool1"]
}}
"""

# ReAct 执行提示词 / ReAct Execution Prompt
REACT_PROMPT = """
使用ReAct方法执行任务。

用户问题：{user_input}
执行计划：{plan}
已执行步骤：{execution_history}
可用工具：{tools_description}

输出JSON（选一种）：
需要工具：{{"thought": "...", "action": "tool_name", "action_input": {{...}}}}
给出答案：{{"thought": "...", "final_answer": "..."}}
"""

# 记忆压缩提示词 / Memory Compression Prompt
MEMORY_COMPRESSION_PROMPT = """
请将以下对话历史压缩为简洁的摘要，保留关键信息和用户偏好。

对话历史：
{messages}

输出JSON：
{{
    "summary": "压缩后的摘要",
    "key_points": ["要点1", "要点2"],
    "user_preferences": ["偏好1", "偏好2"]
}}
"""

# 用户画像生成提示词 / User Profile Generation Prompt
USER_PROFILE_PROMPT = """
基于用户的对话历史和行为，生成用户画像。

对话历史：
{messages}

用户行为：
{behaviors}

输出JSON：
{{
    "learning_style": "学习风格",
    "knowledge_level": "知识水平",
    "interests": ["兴趣1", "兴趣2"],
    "preferences": ["偏好1", "偏好2"]
}}
"""