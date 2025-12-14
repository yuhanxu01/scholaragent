"""
分析工具 / Analysis Tools

提供公式分析、概念比较、详细解释等功能
Provides formula analysis, concept comparison, detailed explanation functionality
"""

import re
from typing import Dict, Any, List, Optional, Union
from django.contrib.auth import get_user_model

from .base import BaseTool, ToolResult, Language
from .registry import ToolRegistry

User = get_user_model()


@ToolRegistry.register
class AnalyzeFormulaTool(BaseTool):
    """公式分析工具 / Formula analysis tool"""
    name = "analyze_formula"
    category = "analysis"
    description_zh = "分析和解释数学公式"
    description_en = "Analyze and explain mathematical formulas"
    async_execution = True
    timeout = 45.0  # 需要更长时间调用 LLM

    parameters = {
        "type": "object",
        "properties": {
            "latex": {
                "type": "string",
                "description_zh": "LaTeX格式的数学公式",
                "description_en": "LaTeX formatted mathematical formula"
            },
            "analysis_type": {
                "type": "string",
                "enum": ["meaning", "variables", "derivation", "application", "comparison"],
                "description_zh": "分析类型",
                "description_en": "Type of analysis"
            },
            "context": {
                "type": "string",
                "description_zh": "公式上下文（可选）",
                "description_en": "Formula context (optional)"
            },
            "language": {
                "type": "string",
                "enum": ["zh", "en"],
                "description_zh": "分析语言偏好",
                "description_en": "Analysis language preference"
            }
        },
        "required": ["latex"]
    }
    required_parameters = ["latex"]

    async def execute(self, latex: str, analysis_type: str = "meaning",
                     context: str = "", language: str = "zh",
                     user_id: Optional[str] = None, **kwargs) -> ToolResult:
        """执行公式分析 / Execute formula analysis"""
        try:
            if not user_id:
                return ToolResult(
                    success=False,
                    error="User ID is required",
                    message_zh="需要用户ID",
                    message_en="User ID is required"
                )

            # 验证 LaTeX 公式
            if not self._is_valid_latex(latex):
                return ToolResult(
                    success=False,
                    error="Invalid LaTeX formula",
                    message_zh="无效的 LaTeX 公式",
                    message_en="Invalid LaTeX formula"
                )

            # 构建分析提示词
            prompt = self._build_analysis_prompt(latex, analysis_type, context, language)

            # 调用 LLM 进行分析
            # TODO: 这里需要集成 LLM 客户端
            # response = await llm_client.generate(prompt)
            # 暂时返回模拟结果
            analysis_result = self._mock_analysis(latex, analysis_type, language)

            return ToolResult(
                success=True,
                data={
                    "formula": latex,
                    "analysis_type": analysis_type,
                    "analysis": analysis_result,
                    "context": context,
                    "language": language
                },
                message_zh=f"公式分析完成",
                message_en="Formula analysis completed"
            )

        except Exception as e:
            return ToolResult(
                success=False,
                error=str(e),
                message_zh=f"分析公式时出错: {str(e)}",
                message_en=f"Error analyzing formula: {str(e)}"
            )

    def _is_valid_latex(self, latex: str) -> bool:
        """验证 LaTeX 公式格式 / Validate LaTeX formula format"""
        # 简单的 LaTeX 验证
        if not latex or not isinstance(latex, str):
            return False

        # 检查是否包含基本的数学环境
        math_patterns = [
            r'\\begin\{equation\}',
            r'\\begin\{align\}',
            r'\$.*\$',
            r'\\\(.*\\\)',
            r'\\\[.*\\\]'
        ]

        for pattern in math_patterns:
            if re.search(pattern, latex):
                return True

        # 如果没有明确的数学环境，检查是否包含数学符号
        math_symbols = ['\\frac', '\\sum', '\\int', '\\partial', '\\alpha', '\\beta', '\\gamma', '\\delta']
        return any(symbol in latex for symbol in math_symbols)

    def _build_analysis_prompt(self, latex: str, analysis_type: str, context: str, language: str) -> str:
        """构建分析提示词 / Build analysis prompt"""
        if language == "zh":
            prompts = {
                "meaning": f"请解释以下数学公式的含义：\n\n公式：${latex}$\n\n上下文：{context}\n\n请用中文详细解释。",
                "variables": f"请分析以下数学公式中的变量和符号：\n\n公式：${latex}$\n\n上下文：{context}\n\n请用中文列出并解释每个变量。",
                "derivation": f"请推导或解释以下数学公式的推导过程：\n\n公式：${latex}$\n\n上下文：{context}\n\n请用中文说明推导步骤。",
                "application": f"请说明以下数学公式的应用场景：\n\n公式：${latex}$\n\n上下文：{context}\n\n请用中文举例说明。",
                "comparison": f"请比较以下数学公式与其他相关公式：\n\n公式：${latex}$\n\n上下文：{context}\n\n请用中文进行分析比较。"
            }
        else:
            prompts = {
                "meaning": f"Please explain the meaning of the following mathematical formula:\n\nFormula: ${latex}$\n\nContext: {context}\n\nPlease provide detailed explanation in English.",
                "variables": f"Please analyze the variables and symbols in the following mathematical formula:\n\nFormula: ${latex}$\n\nContext: {context}\n\nPlease list and explain each variable in English.",
                "derivation": f"Please derive or explain the derivation process of the following mathematical formula:\n\nFormula: ${latex}$\n\nContext: {context}\n\nPlease explain the derivation steps in English.",
                "application": f"Please describe the application scenarios of the following mathematical formula:\n\nFormula: ${latex}$\n\nContext: {context}\n\nPlease provide examples in English.",
                "comparison": f"Please compare the following mathematical formula with other related formulas:\n\nFormula: ${latex}$\n\nContext: {context}\n\nPlease provide analysis and comparison in English."
            }

        return prompts.get(analysis_type, prompts["meaning"])

    def _mock_analysis(self, latex: str, analysis_type: str, language: str) -> Dict[str, Any]:
        """模拟分析结果（实际使用时替换为 LLM 调用）"""
        # 这里是一个模拟的响应，实际使用时应该调用真实的 LLM
        if language == "zh":
            mock_results = {
                "meaning": {
                    "explanation": f"这是一个数学公式，表示某种数学关系或运算。",
                    "key_points": ["公式结构", "数学含义", "应用领域"],
                    "simplified_explanation": "简单来说，这个公式描述了..."
                },
                "variables": {
                    "variables": [
                        {"symbol": "x", "meaning": "变量x"},
                        {"symbol": "y", "meaning": "变量y"}
                    ]
                }
            }
        else:
            mock_results = {
                "meaning": {
                    "explanation": f"This is a mathematical formula representing some mathematical relationship or operation.",
                    "key_points": ["Formula structure", "Mathematical meaning", "Application areas"],
                    "simplified_explanation": "In simple terms, this formula describes..."
                },
                "variables": {
                    "variables": [
                        {"symbol": "x", "meaning": "Variable x"},
                        {"symbol": "y", "meaning": "Variable y"}
                    ]
                }
            }

        return mock_results.get(analysis_type, mock_results["meaning"])


@ToolRegistry.register
class CompareConceptsTool(BaseTool):
    """概念比较工具 / Concept comparison tool"""
    name = "compare_concepts"
    category = "analysis"
    description_zh = "对比多个概念的异同"
    description_en = "Compare similarities and differences between multiple concepts"
    async_execution = True
    timeout = 45.0

    parameters = {
        "type": "object",
        "properties": {
            "concepts": {
                "type": "array",
                "description_zh": "要比较的概念列表",
                "description_en": "List of concepts to compare",
                "items": {"type": "string"}
            },
            "comparison_type": {
                "type": "string",
                "enum": ["differences", "similarities", "both", "hierarchy"],
                "description_zh": "比较类型",
                "description_en": "Type of comparison"
            },
            "aspect": {
                "type": "string",
                "description_zh": "比较的方面（可选）",
                "description_en": "Aspect of comparison (optional)"
            },
            "language": {
                "type": "string",
                "enum": ["zh", "en"],
                "description_zh": "比较语言偏好",
                "description_en": "Comparison language preference"
            }
        },
        "required": ["concepts"]
    }
    required_parameters = ["concepts"]

    async def execute(self, concepts: List[str], comparison_type: str = "both",
                     aspect: str = "", language: str = "zh",
                     user_id: Optional[str] = None, **kwargs) -> ToolResult:
        """执行概念比较 / Execute concept comparison"""
        try:
            if not user_id:
                return ToolResult(
                    success=False,
                    error="User ID is required",
                    message_zh="需要用户ID",
                    message_en="User ID is required"
                )

            if len(concepts) < 2:
                return ToolResult(
                    success=False,
                    error="At least 2 concepts are required for comparison",
                    message_zh="至少需要2个概念进行比较",
                    message_en="At least 2 concepts are required for comparison"
                )

            # 从知识库中查找概念定义
            from apps.knowledge.models import Concept
            concept_details = {}

            for concept_name in concepts:
                concept = Concept.objects.filter(
                    user_id=user_id,
                    name__icontains=concept_name
                ).first()

                if concept:
                    concept_details[concept_name] = {
                        "id": str(concept.id),
                        "name": concept.name,
                        "description": concept.description,
                        "content": concept.content[:500],  # 限制长度
                        "type": concept.concept_type
                    }
                else:
                    concept_details[concept_name] = {
                        "name": concept_name,
                        "description": "概念未找到",
                        "content": ""
                    }

            # 构建比较提示词
            prompt = self._build_comparison_prompt(concept_details, comparison_type, aspect, language)

            # TODO: 调用 LLM 进行比较分析
            # comparison_result = await llm_client.generate(prompt)
            # 暂时返回模拟结果
            comparison_result = self._mock_comparison(concept_details, comparison_type, language)

            return ToolResult(
                success=True,
                data={
                    "concepts": concept_details,
                    "comparison_type": comparison_type,
                    "aspect": aspect,
                    "comparison": comparison_result,
                    "language": language
                },
                message_zh=f"概念比较完成",
                message_en="Concept comparison completed"
            )

        except Exception as e:
            return ToolResult(
                success=False,
                error=str(e),
                message_zh=f"比较概念时出错: {str(e)}",
                message_en=f"Error comparing concepts: {str(e)}"
            )

    def _build_comparison_prompt(self, concepts: Dict, comparison_type: str, aspect: str, language: str) -> str:
        """构建比较提示词 / Build comparison prompt"""
        concept_texts = []
        for name, details in concepts.items():
            concept_texts.append(f"- {name}: {details['description']}")

        concepts_str = "\n".join(concept_texts)

        if language == "zh":
            prompt = f"""请比较以下概念：

{concepts_str}

比较类型：{comparison_type}
比较方面：{aspect or "全面比较"}

请从以下角度进行比较：
1. 定义和本质
2. 特征和属性
3. 应用场景
4. 相互关系

请用中文进行分析。"""
        else:
            prompt = f"""Please compare the following concepts:

{concepts_str}

Comparison type: {comparison_type}
Aspect: {aspect or "Comprehensive comparison"}

Please compare from the following angles:
1. Definition and essence
2. Features and attributes
3. Application scenarios
4. Interrelationships

Please provide analysis in English."""

        return prompt

    def _mock_comparison(self, concepts: Dict, comparison_type: str, language: str) -> Dict[str, Any]:
        """模拟比较结果 / Mock comparison result"""
        if language == "zh":
            mock_result = {
                "summary": "这些概念在某些方面相似，在其他方面不同。",
                "similarities": [
                    "共同特征1",
                    "共同特征2"
                ],
                "differences": [
                    "差异1",
                    "差异2"
                ],
                "relationship": "这些概念之间存在着某种关系..."
            }
        else:
            mock_result = {
                "summary": "These concepts are similar in some aspects and different in others.",
                "similarities": [
                    "Common feature 1",
                    "Common feature 2"
                ],
                "differences": [
                    "Difference 1",
                    "Difference 2"
                ],
                "relationship": "There is some relationship between these concepts..."
            }

        return mock_result


@ToolRegistry.register
class GenerateExplanationTool(BaseTool):
    """生成解释工具 / Generate explanation tool"""
    name = "generate_explanation"
    category = "analysis"
    description_zh = "生成详细解释，支持不同难度级别"
    description_en = "Generate detailed explanations with different difficulty levels"
    async_execution = True
    timeout = 45.0

    parameters = {
        "type": "object",
        "properties": {
            "topic": {
                "type": "string",
                "description_zh": "要解释的主题或概念",
                "description_en": "Topic or concept to explain"
            },
            "difficulty": {
                "type": "string",
                "enum": ["beginner", "intermediate", "advanced", "expert"],
                "description_zh": "难度级别",
                "description_en": "Difficulty level"
            },
            "explanation_type": {
                "type": "string",
                "enum": ["concept", "example", "analogy", "step_by_step", "comprehensive"],
                "description_zh": "解释类型",
                "description_en": "Type of explanation"
            },
            "context": {
                "type": "string",
                "description_zh": "上下文信息（可选）",
                "description_en": "Context information (optional)"
            },
            "language": {
                "type": "string",
                "enum": ["zh", "en"],
                "description_zh": "解释语言偏好",
                "description_en": "Explanation language preference"
            }
        },
        "required": ["topic"]
    }
    required_parameters = ["topic"]

    async def execute(self, topic: str, difficulty: str = "intermediate",
                     explanation_type: str = "comprehensive", context: str = "",
                     language: str = "zh", user_id: Optional[str] = None,
                     **kwargs) -> ToolResult:
        """生成解释 / Generate explanation"""
        try:
            if not user_id:
                return ToolResult(
                    success=False,
                    error="User ID is required",
                    message_zh="需要用户ID",
                    message_en="User ID is required"
                )

            # 查找相关概念作为上下文
            from apps.knowledge.models import Concept
            related_concepts = Concept.objects.filter(
                user_id=user_id,
                name__icontains=topic
            ).values('name', 'description', 'content')[:3]

            concept_context = ""
            if related_concepts:
                concept_context = f"相关概念：\n"
                for concept in related_concepts:
                    concept_context += f"- {concept['name']}: {concept['description']}\n"

            # 构建解释提示词
            prompt = self._build_explanation_prompt(
                topic, difficulty, explanation_type, context, concept_context, language
            )

            # TODO: 调用 LLM 生成解释
            # explanation = await llm_client.generate(prompt)
            # 暂时返回模拟结果
            explanation = self._mock_explanation(topic, difficulty, explanation_type, language)

            return ToolResult(
                success=True,
                data={
                    "topic": topic,
                    "difficulty": difficulty,
                    "explanation_type": explanation_type,
                    "context": context,
                    "explanation": explanation,
                    "related_concepts": list(related_concepts),
                    "language": language
                },
                message_zh=f"解释生成完成",
                message_en="Explanation generated successfully"
            )

        except Exception as e:
            return ToolResult(
                success=False,
                error=str(e),
                message_zh=f"生成解释时出错: {str(e)}",
                message_en=f"Error generating explanation: {str(e)}"
            )

    def _build_explanation_prompt(self, topic: str, difficulty: str, explanation_type: str,
                                context: str, concept_context: str, language: str) -> str:
        """构建解释提示词 / Build explanation prompt"""
        if language == "zh":
            difficulty_map = {
                "beginner": "初学者（适合完全不了解的人）",
                "intermediate": "中级（有一定基础的人）",
                "advanced": "高级（深入理解）",
                "expert": "专家级别（技术细节）"
            }

            type_map = {
                "concept": "概念解释",
                "example": "举例说明",
                "analogy": "类比比喻",
                "step_by_step": "步骤说明",
                "comprehensive": "全面解释"
            }

            prompt = f"""请解释以下主题：

主题：{topic}
难度级别：{difficulty_map.get(difficulty, difficulty)}
解释类型：{type_map.get(explanation_type, explanation_type)}

上下文信息：{context}

{concept_context}

请根据指定的难度级别和解释类型，提供详细、准确、易懂的解释。如果是初学者级别，请使用简单的语言和具体例子。"""
        else:
            difficulty_map = {
                "beginner": "Beginner (for those with no prior knowledge)",
                "intermediate": "Intermediate (for those with some background)",
                "advanced": "Advanced (in-depth understanding)",
                "expert": "Expert level (technical details)"
            }

            type_map = {
                "concept": "Concept explanation",
                "example": "Illustrative examples",
                "analogy": "Analogies and metaphors",
                "step_by_step": "Step-by-step explanation",
                "comprehensive": "Comprehensive explanation"
            }

            prompt = f"""Please explain the following topic:

Topic: {topic}
Difficulty level: {difficulty_map.get(difficulty, difficulty)}
Explanation type: {type_map.get(explanation_type, explanation_type)}

Context: {context}

{concept_context}

Please provide a detailed, accurate, and easy-to-understand explanation based on the specified difficulty level and explanation type. If beginner level, use simple language and concrete examples."""

        return prompt

    def _mock_explanation(self, topic: str, difficulty: str, explanation_type: str, language: str) -> Dict[str, Any]:
        """模拟解释结果 / Mock explanation result"""
        if language == "zh":
            mock_result = {
                "main_explanation": f"关于'{topic}'的详细解释...",
                "key_points": [
                    "要点1",
                    "要点2",
                    "要点3"
                ],
                "examples": [
                    "例子1",
                    "例子2"
                ] if explanation_type in ["example", "comprehensive"] else [],
                "analogies": [
                    "类比1"
                ] if explanation_type in ["analogy", "comprehensive"] else [],
                "steps": [
                    "步骤1",
                    "步骤2",
                    "步骤3"
                ] if explanation_type == "step_by_step" else [],
                "further_reading": [
                    "相关阅读材料1",
                    "相关阅读材料2"
                ]
            }
        else:
            mock_result = {
                "main_explanation": f"Detailed explanation of '{topic}'...",
                "key_points": [
                    "Key point 1",
                    "Key point 2",
                    "Key point 3"
                ],
                "examples": [
                    "Example 1",
                    "Example 2"
                ] if explanation_type in ["example", "comprehensive"] else [],
                "analogies": [
                    "Analogy 1"
                ] if explanation_type in ["analogy", "comprehensive"] else [],
                "steps": [
                    "Step 1",
                    "Step 2",
                    "Step 3"
                ] if explanation_type == "step_by_step" else [],
                "further_reading": [
                    "Related reading 1",
                    "Related reading 2"
                ]
            }

        return mock_result