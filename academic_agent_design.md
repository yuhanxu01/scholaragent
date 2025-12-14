# 📚 ScholarMind - 学术AI Agent 系统设计方案

## 一、产品定位与愿景

### 1.1 核心定位
**ScholarMind** 是一个专为理工科学生设计的学术阅读AI Agent，它不仅是一个文献阅读器，更是一个**能主动思考、规划、执行任务的智能研究助手**。

### 1.2 与普通AI Chat的区别

```
普通AI Chat：
用户提问 → AI回答 → 结束

AI Agent：
用户提出目标 → Agent分析任务 → 制定计划 → 调用工具 → 反思结果 → 迭代优化 → 达成目标
```

### 1.3 核心能力矩阵

| 能力维度 | 具体功能 | Agent特性 |
|---------|---------|----------|
| 📖 阅读理解 | 文献解析、公式渲染、多格式支持 | 主动识别难点 |
| 🔍 智能检索 | 概念查询、跨文档搜索、外部资源 | 自主决定检索策略 |
| 🧠 知识管理 | 概念索引、笔记系统、复习卡片 | 自动构建知识网络 |
| 💬 深度问答 | 段落解释、推导验证、概念辨析 | 多步推理、追问澄清 |
| 📝 写作辅助 | 笔记生成、摘要撰写、公式推导 | 理解写作意图 |
| 🎯 学习规划 | 阅读建议、知识图谱、学习路径 | 个性化推荐 |

---

## 二、系统整体架构

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           用户界面层 (Frontend)                          │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐   │
│  │  文献阅读器   │ │  Agent对话   │ │  知识库面板   │ │  学习仪表盘   │   │
│  │  - 渲染视图   │ │  - 聊天界面  │ │  - 概念浏览  │ │  - 进度追踪  │   │
│  │  - 标注工具   │ │  - 任务面板  │ │  - 笔记管理  │ │  - 复习计划  │   │
│  │  - 目录导航   │ │  - 工具状态  │ │  - 卡片复习  │ │  - 统计分析  │   │
│  └──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘   │
└────────────────────────────────┬────────────────────────────────────────┘
                                 │ WebSocket / REST API
                                 ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                          API Gateway (Django)                            │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                     认证 / 限流 / 路由                           │    │
│  └─────────────────────────────────────────────────────────────────┘    │
└────────────────────────────────┬────────────────────────────────────────┘
                                 │
        ┌────────────────────────┼────────────────────────┐
        ▼                        ▼                        ▼
┌───────────────┐      ┌─────────────────┐      ┌─────────────────┐
│  文档处理服务  │      │   Agent 核心    │      │   知识管理服务   │
│               │      │                 │      │                 │
│ - 格式解析    │      │ - 任务规划器    │      │ - 概念索引      │
│ - LaTeX清洗   │      │ - 工具调度器    │      │ - 笔记存储      │
│ - 内容分块    │      │ - 记忆管理器    │      │ - 关系图谱      │
│ - 索引生成    │      │ - 反思引擎      │      │ - 检索引擎      │
└───────┬───────┘      └────────┬────────┘      └────────┬────────┘
        │                       │                        │
        │              ┌────────┴────────┐               │
        │              ▼                 ▼               │
        │      ┌─────────────┐   ┌─────────────┐        │
        │      │  LLM 服务   │   │  工具集合   │        │
        │      │ (DeepSeek)  │   │             │        │
        │      │             │   │ - 检索工具  │        │
        │      │ - 推理      │   │ - 计算工具  │        │
        │      │ - 生成      │   │ - 搜索工具  │        │
        │      │ - 分析      │   │ - 笔记工具  │        │
        │      └─────────────┘   └─────────────┘        │
        │                                               │
        └───────────────────┬───────────────────────────┘
                            ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                            数据存储层                                    │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐   │
│  │  PostgreSQL  │ │    Redis     │ │ File Storage │ │   SQLite     │   │
│  │              │ │              │ │              │ │   FTS5       │   │
│  │ - 用户数据   │ │ - 会话缓存   │ │ - 原始文档   │ │ - 全文检索   │   │
│  │ - 文档元数据 │ │ - 任务队列   │ │ - 生成文件   │ │ - 概念索引   │   │
│  │ - 笔记/卡片 │ │ - Agent状态  │ │              │ │              │   │
│  └──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 三、Agent 核心设计（重点）

### 3.1 Agent 架构：ReAct + Planning + Reflection

```
┌─────────────────────────────────────────────────────────────────┐
│                      ScholarMind Agent                          │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    任务规划器 (Planner)                   │   │
│  │  接收用户目标 → 分解子任务 → 生成执行计划                  │   │
│  └─────────────────────────────────────────────────────────┘   │
│                              │                                  │
│                              ▼                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                   执行循环 (ReAct Loop)                   │   │
│  │                                                         │   │
│  │    ┌─────────┐    ┌─────────┐    ┌─────────┐           │   │
│  │    │ Thought │ → │ Action  │ → │Observation│ ──┐       │   │
│  │    │  思考   │    │  行动   │    │  观察    │   │       │   │
│  │    └─────────┘    └─────────┘    └─────────┘   │       │   │
│  │         ▲                                      │       │   │
│  │         └──────────────────────────────────────┘       │   │
│  └─────────────────────────────────────────────────────────┘   │
│                              │                                  │
│                              ▼                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    反思引擎 (Reflector)                   │   │
│  │  评估结果质量 → 识别错误/不足 → 决定是否迭代              │   │
│  └─────────────────────────────────────────────────────────┘   │
│                              │                                  │
│                              ▼                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    记忆管理器 (Memory)                    │   │
│  │                                                         │   │
│  │  ┌───────────┐  ┌───────────┐  ┌───────────────────┐   │   │
│  │  │ 工作记忆  │  │ 情景记忆  │  │     长期记忆       │   │   │
│  │  │ (当前任务)│  │ (会话历史)│  │ (用户画像+知识库) │   │   │
│  │  └───────────┘  └───────────┘  └───────────────────┘   │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### 3.2 Agent 工具集设计

```python
AGENT_TOOLS = {
    # ===== 检索类工具 =====
    "search_concepts": {
        "description": "在用户知识库中搜索概念定义、定理、公式",
        "parameters": {
            "query": "搜索关键词",
            "doc_scope": "all | current | specific_doc_id",
            "type_filter": "definition | theorem | formula | all"
        }
    },
    
    "search_content": {
        "description": "在文档内容中进行全文搜索",
        "parameters": {
            "query": "搜索文本",
            "doc_scope": "搜索范围",
            "context_lines": "返回上下文行数"
        }
    },
    
    "get_section": {
        "description": "获取文档特定章节的完整内容",
        "parameters": {
            "doc_id": "文档ID",
            "section_id": "章节ID"
        }
    },
    
    "web_search": {
        "description": "搜索外部学术资源（Wikipedia、arXiv等）",
        "parameters": {
            "query": "搜索词",
            "source": "wikipedia | arxiv | google_scholar"
        }
    },
    
    # ===== 分析类工具 =====
    "analyze_formula": {
        "description": "分析和解释数学公式",
        "parameters": {
            "latex": "LaTeX公式",
            "analysis_type": "meaning | derivation | variables"
        }
    },
    
    "compare_concepts": {
        "description": "对比两个或多个概念的异同",
        "parameters": {
            "concepts": ["概念1", "概念2"],
            "aspects": ["定义", "应用", "区别"]
        }
    },
    
    "trace_prerequisites": {
        "description": "追溯某个概念的前置知识链",
        "parameters": {
            "concept": "目标概念",
            "depth": "追溯深度"
        }
    },
    
    # ===== 知识管理工具 =====
    "create_note": {
        "description": "创建学习笔记",
        "parameters": {
            "title": "笔记标题",
            "content": "笔记内容",
            "linked_concepts": ["关联概念"],
            "source_location": "来源位置"
        }
    },
    
    "create_flashcard": {
        "description": "创建复习卡片",
        "parameters": {
            "front": "卡片正面（问题）",
            "back": "卡片背面（答案）",
            "tags": ["标签"]
        }
    },
    
    "update_concept_relation": {
        "description": "更新概念之间的关系",
        "parameters": {
            "concept_a": "概念A",
            "concept_b": "概念B",
            "relation_type": "prerequisite | related | extends | contradicts"
        }
    },
    
    # ===== 计算类工具 =====
    "latex_to_sympy": {
        "description": "将LaTeX转换为SymPy表达式并计算",
        "parameters": {
            "latex": "LaTeX表达式",
            "operation": "simplify | solve | diff | integrate"
        }
    },
    
    "verify_derivation": {
        "description": "验证数学推导的正确性",
        "parameters": {
            "steps": ["推导步骤"],
            "assumptions": ["假设条件"]
        }
    },
    
    # ===== 生成类工具 =====
    "generate_summary": {
        "description": "生成内容摘要",
        "parameters": {
            "content": "原始内容",
            "style": "brief | detailed | bullet_points",
            "max_length": "最大字数"
        }
    },
    
    "generate_explanation": {
        "description": "生成概念或公式的详细解释",
        "parameters": {
            "target": "目标概念/公式",
            "level": "beginner | intermediate | advanced",
            "include_examples": True
        }
    },
    
    # ===== 用户交互工具 =====
    "ask_clarification": {
        "description": "向用户询问澄清问题",
        "parameters": {
            "question": "问题内容",
            "options": ["选项（可选）"]
        }
    },
    
    "show_progress": {
        "description": "向用户展示当前任务进度",
        "parameters": {
            "current_step": "当前步骤",
            "total_steps": "总步骤数",
            "message": "进度信息"
        }
    }
}
```

### 3.3 Agent 执行流程示例

```
用户输入: "帮我理解这篇文章中的变分法，我对数学基础一般"

┌─────────────────────────────────────────────────────────────────┐
│ Step 1: 任务规划                                                │
├─────────────────────────────────────────────────────────────────┤
│ Planner思考:                                                    │
│ - 用户目标: 理解"变分法"                                        │
│ - 用户背景: 数学基础一般                                        │
│ - 需要: 1) 定位文中变分法内容 2) 理解前置知识 3) 分层解释       │
│                                                                 │
│ 生成计划:                                                       │
│ 1. 搜索文档中"变分法"相关内容                                   │
│ 2. 提取涉及的前置概念                                           │
│ 3. 检查用户知识库是否已掌握这些前置概念                         │
│ 4. 对未掌握的前置概念进行简要解释                               │
│ 5. 用通俗语言解释变分法核心思想                                 │
│ 6. 解释文中具体应用                                             │
│ 7. 生成复习卡片帮助记忆                                         │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│ Step 2: ReAct执行循环                                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ 【迭代 1】                                                      │
│ Thought: 首先需要找到文档中关于变分法的内容                     │
│ Action: search_concepts(query="变分法", doc_scope="current")    │
│ Observation: 找到3处提及，主要在第3章第2节，涉及泛函极值问题    │
│                                                                 │
│ 【迭代 2】                                                      │
│ Thought: 获取该章节完整内容以理解上下文                         │
│ Action: get_section(doc_id="xxx", section_id="3.2")             │
│ Observation: [章节内容，包含欧拉-拉格朗日方程等]                │
│                                                                 │
│ 【迭代 3】                                                      │
│ Thought: 内容涉及泛函、欧拉方程，需要检查用户是否了解这些概念   │
│ Action: trace_prerequisites(concept="变分法", depth=2)          │
│ Observation: 前置概念链: 泛函 → 微积分 → 函数极值               │
│                                                                 │
│ 【迭代 4】                                                      │
│ Thought: 用户说数学基础一般，先用类比解释核心思想               │
│ Action: generate_explanation(                                   │
│           target="变分法",                                      │
│           level="beginner",                                     │
│           include_examples=True                                 │
│         )                                                       │
│ Observation: [生成了通俗解释，使用最速降线问题作为例子]         │
│                                                                 │
│ 【迭代 5】                                                      │
│ Thought: 现在可以组织回答了，同时创建复习卡片                   │
│ Action: create_flashcard(                                       │
│           front="什么是变分法？它解决什么类型的问题？",          │
│           back="变分法是求泛函极值的方法...",                    │
│           tags=["变分法", "优化"]                                │
│         )                                                       │
│ Observation: 卡片已创建                                         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│ Step 3: 反思与优化                                              │
├─────────────────────────────────────────────────────────────────┤
│ Reflector评估:                                                  │
│ - 是否回答了用户问题？ ✓                                        │
│ - 解释深度是否匹配用户水平？ ✓                                  │
│ - 是否需要补充更多例子？ 可以询问用户                           │
│                                                                 │
│ 决策: 先输出当前答案，询问是否需要更详细的推导                  │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│ Step 4: 输出响应                                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ 📖 关于变分法，我来帮你梳理一下：                               │
│                                                                 │
│ **核心思想（类比理解）**                                        │
│ 普通微积分求的是"函数的极值"（比如抛物线的最低点）             │
│ 变分法求的是"泛函的极值"——也就是找一个最优的"函数"            │
│                                                                 │
│ 举个例子：从A点滑到B点，什么形状的滑梯最快？                    │
│ 答案不是直线，而是一条叫"旋轮线"的曲线。                       │
│ 变分法就是用来找这种"最优曲线"的数学工具。                     │
│                                                                 │
│ **文章中的应用**                                                │
│ 在第3.2节，作者用变分法推导了...                                │
│ [定位到具体段落的解释]                                          │
│                                                                 │
│ **关键公式**                                                    │
│ 欧拉-拉格朗日方程: $\frac{\partial L}{\partial y} - ...$        │
│ [公式含义解释]                                                  │
│                                                                 │
│ 💡 我已经为你创建了一张复习卡片。                               │
│ 需要我更详细地解释欧拉-拉格朗日方程的推导过程吗？               │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 四、记忆系统设计

### 4.1 三层记忆架构

```
┌─────────────────────────────────────────────────────────────────┐
│                         记忆系统                                │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                   工作记忆 (Working Memory)              │   │
│  │                      存储位置: Redis                     │   │
│  │                      生命周期: 单次任务                  │   │
│  │                                                         │   │
│  │  内容:                                                   │   │
│  │  - 当前任务目标和计划                                    │   │
│  │  - 已执行的工具调用和结果                                │   │
│  │  - 当前对话的关键信息                                    │   │
│  │  - 检索到的相关内容片段                                  │   │
│  └─────────────────────────────────────────────────────────┘   │
│                              │                                  │
│                              ▼                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                   情景记忆 (Episodic Memory)             │   │
│  │                      存储位置: PostgreSQL                │   │
│  │                      生命周期: 会话级别                  │   │
│  │                                                         │   │
│  │  内容:                                                   │   │
│  │  - 会话历史摘要（压缩后的对话）                          │   │
│  │  - 用户在本次会话中的问题模式                            │   │
│  │  - 会话中产生的临时笔记                                  │   │
│  │  - 用户表达的偏好和反馈                                  │   │
│  └─────────────────────────────────────────────────────────┘   │
│                              │                                  │
│                              ▼                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                   长期记忆 (Long-term Memory)            │   │
│  │                      存储位置: PostgreSQL + JSON         │   │
│  │                      生命周期: 永久                      │   │
│  │                                                         │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐      │   │
│  │  │  用户画像   │  │  知识库     │  │  学习记录   │      │   │
│  │  │            │  │            │  │            │      │   │
│  │  │ - 专业背景 │  │ - 概念索引 │  │ - 阅读历史 │      │   │
│  │  │ - 知识水平 │  │ - 笔记系统 │  │ - 掌握程度 │      │   │
│  │  │ - 学习偏好 │  │ - 卡片系统 │  │ - 复习计划 │      │   │
│  │  │ - 常见困难 │  │ - 文档索引 │  │ - 薄弱点  │      │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘      │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### 4.2 记忆压缩策略（节省Token的关键）

```python
class MemoryCompressor:
    """
    记忆压缩器：将长对话历史压缩为结构化摘要
    避免每次都传入完整历史，大幅节省Token
    """
    
    def compress_conversation(self, messages: list) -> dict:
        """
        将对话历史压缩为结构化摘要
        
        输入: 20轮对话 (~4000 tokens)
        输出: 压缩摘要 (~300 tokens)
        """
        return {
            "session_summary": "用户正在阅读XXX论文，主要关注变分法部分",
            "user_questions": [
                "询问了变分法的基本概念",
                "对欧拉方程推导有困惑",
                "想了解实际应用"
            ],
            "key_clarifications": [
                "用户数学背景：本科微积分水平",
                "偏好：喜欢类比解释和具体例子"
            ],
            "unresolved_points": [
                "第3章的某个推导步骤仍不清楚"
            ],
            "created_artifacts": [
                "创建了3张复习卡片",
                "生成了概念关系图"
            ]
        }
    
    def get_relevant_context(self, query: str, memory: dict) -> str:
        """
        根据当前问题，从长期记忆中提取相关上下文
        避免加载全部记忆
        """
        # 关键词匹配 + 时间衰减
        pass
```

### 4.3 用户画像系统

```python
USER_PROFILE_SCHEMA = {
    "user_id": "uuid",
    
    # 基础信息
    "background": {
        "education_level": "undergraduate | graduate | phd | professional",
        "major": "数学 | 物理 | 计算机 | ...",
        "math_level": 1-5,  # 自评或系统评估
        "programming_level": 1-5,
        "research_interests": ["机器学习", "优化理论"]
    },
    
    # 学习偏好（通过交互自动学习）
    "preferences": {
        "explanation_style": "formal | intuitive | example_based",
        "detail_level": "concise | moderate | detailed",
        "language": "zh | en | mixed",
        "formula_explanation": True,  # 是否需要公式详解
        "like_analogies": True,  # 是否喜欢类比
        "like_visualizations": True
    },
    
    # 知识掌握情况（动态更新）
    "knowledge_state": {
        "mastered_concepts": [
            {"concept": "微积分", "confidence": 0.9},
            {"concept": "线性代数", "confidence": 0.7}
        ],
        "weak_points": [
            {"concept": "泛函分析", "confidence": 0.3}
        ],
        "learning_history": [
            {"concept": "变分法", "first_seen": "2024-01-15", "review_count": 3}
        ]
    },
    
    # 使用统计
    "statistics": {
        "total_documents": 15,
        "total_questions": 234,
        "avg_session_duration": 45,  # 分钟
        "active_days": 30,
        "streak_days": 7
    }
}
```

---

## 五、知识索引系统（轻量方案详解）

### 5.1 文档预处理流水线

```
原始文档 (MD/TeX/PDF)
         │
         ▼
┌────────────────────────────────────────────────────────────────┐
│                    文档预处理流水线                             │
│                                                                │
│  Stage 1: 格式标准化                                           │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │ - TeX → 清洗后的TeX (移除环境、注释等)                    │ │
│  │ - MD → 标准化Markdown                                     │ │
│  │ - PDF → 文本提取 (PyMuPDF) → Markdown                     │ │
│  └──────────────────────────────────────────────────────────┘ │
│                            │                                   │
│                            ▼                                   │
│  Stage 2: 结构解析                                             │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │ - 识别章节层级 (H1/H2/H3...)                              │ │
│  │ - 识别特殊块 (定理/证明/例子/公式)                        │ │
│  │ - 提取所有LaTeX公式并编号                                 │ │
│  │ - 建立内部引用关系                                        │ │
│  └──────────────────────────────────────────────────────────┘ │
│                            │                                   │
│                            ▼                                   │
│  Stage 3: 智能分块                                             │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │ 分块策略:                                                 │ │
│  │ - 语义边界优先 (章节/段落/定理块)                         │ │
│  │ - 块大小: 500-1500字符                                    │ │
│  │ - 块重叠: 100字符                                         │ │
│  │ - 保持公式完整性                                          │ │
│  └──────────────────────────────────────────────────────────┘ │
│                            │                                   │
│                            ▼                                   │
│  Stage 4: LLM索引生成（一次性调用）                            │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │ 调用DeepSeek生成:                                         │ │
│  │ - 文档摘要 (200字)                                        │ │
│  │ - 各章节摘要 (50字/章)                                    │ │
│  │ - 概念列表 (名称+类型+简述+位置)                          │ │
│  │ - 公式描述 (每个公式的含义)                               │ │
│  │ - 关键词提取                                              │ │
│  │ - 难度评估                                                │ │
│  │ - 前置知识推断                                            │ │
│  └──────────────────────────────────────────────────────────┘ │
│                            │                                   │
│                            ▼                                   │
│  Stage 5: 索引存储                                             │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │ - PostgreSQL: 结构化元数据                                │ │
│  │ - SQLite FTS5: 全文索引                                   │ │
│  │ - JSON文件: 详细索引数据                                  │ │
│  └──────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────┘
```

### 5.2 混合检索策略

```python
class HybridRetriever:
    """
    混合检索器：结合多种轻量检索方法
    无需向量数据库，纯CPU运行
    """
    
    def retrieve(self, query: str, doc_scope: str = "all") -> list:
        """
        多路召回 + 简单融合
        """
        results = []
        
        # 路径1: 概念精确匹配（优先级最高）
        concept_matches = self.concept_exact_match(query)
        results.extend([(r, 1.0) for r in concept_matches])
        
        # 路径2: SQLite FTS5 全文检索
        fts_results = self.fts5_search(query)
        results.extend([(r, 0.8) for r in fts_results])
        
        # 路径3: 关键词匹配 + TF-IDF
        keyword_results = self.keyword_search(query)
        results.extend([(r, 0.6) for r in keyword_results])
        
        # 路径4: 章节摘要匹配（用于定位相关章节）
        summary_results = self.summary_match(query)
        results.extend([(r, 0.4) for r in summary_results])
        
        # 去重 + 排序
        return self.merge_and_rank(results)
    
    def concept_exact_match(self, query: str) -> list:
        """概念名精确/模糊匹配"""
        # 使用 PostgreSQL 的 pg_trgm 扩展做模糊匹配
        pass
    
    def fts5_search(self, query: str) -> list:
        """SQLite FTS5 全文检索"""
        # 支持中文分词（使用jieba预处理）
        pass
    
    def keyword_search(self, query: str) -> list:
        """基于预提取关键词的匹配"""
        # 匹配文档的keywords字段
        pass
```

### 5.3 轻量"知识图谱"替代方案

```python
# 用关系表替代图数据库
class ConceptRelation(models.Model):
    """概念关系表 - 替代Neo4j"""
    
    source_concept = models.ForeignKey(Concept, related_name='outgoing')
    target_concept = models.ForeignKey(Concept, related_name='incoming')
    relation_type = models.CharField(max_length=50, choices=[
        ('prerequisite', '前置知识'),     # A是B的前置
        ('related', '相关概念'),          # A和B相关
        ('extends', '扩展/推广'),         # A是B的推广
        ('example_of', '是...的例子'),    # A是B的实例
        ('part_of', '组成部分'),          # A是B的一部分
        ('contrast', '对比概念'),         # A和B形成对比
    ])
    confidence = models.FloatField(default=0.8)  # 关系置信度
    source = models.CharField(max_length=20)  # 'llm' | 'user' | 'system'
    
    class Meta:
        unique_together = ('source_concept', 'target_concept', 'relation_type')
        indexes = [
            models.Index(fields=['source_concept']),
            models.Index(fields=['target_concept']),
            models.Index(fields=['relation_type']),
        ]


def get_concept_graph(concept_id: int, depth: int = 2) -> dict:
    """
    获取概念的关系网络（替代图查询）
    使用递归CTE或多次查询实现
    """
    from django.db.models import Q
    
    visited = set()
    graph = {"nodes": [], "edges": []}
    queue = [(concept_id, 0)]
    
    while queue:
        current_id, current_depth = queue.pop(0)
        if current_id in visited or current_depth > depth:
            continue
        visited.add(current_id)
        
        concept = Concept.objects.get(id=current_id)
        graph["nodes"].append({
            "id": concept.id,
            "name": concept.name,
            "type": concept.concept_type
        })
        
        # 获取相关关系
        relations = ConceptRelation.objects.filter(
            Q(source_concept_id=current_id) | Q(target_concept_id=current_id)
        )
        
        for rel in relations:
            graph["edges"].append({
                "source": rel.source_concept_id,
                "target": rel.target_concept_id,
                "type": rel.relation_type
            })
            
            next_id = rel.target_concept_id if rel.source_concept_id == current_id else rel.source_concept_id
            if next_id not in visited:
                queue.append((next_id, current_depth + 1))
    
    return graph
```

---

## 六、前端界面设计

### 6.1 整体布局

```
┌────────────────────────────────────────────────────────────────────────────┐
│  ScholarMind                    [🔍 搜索] [📚 知识库] [👤 用户]  [⚙️]     │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│  ┌─────────────────────────────┐  ┌─────────────────────────────────────┐ │
│  │       文档阅读区 (60%)       │  │         Agent交互区 (40%)          │ │
│  │                             │  │                                     │ │
│  │  ┌─────────────────────┐   │  │  ┌───────────────────────────────┐ │ │
│  │  │      目录导航        │   │  │  │        任务状态面板           │ │ │
│  │  │                     │   │  │  │  📋 当前任务: 解释变分法      │ │ │
│  │  │  1. 引言            │   │  │  │  ⏳ 状态: 检索相关内容...     │ │ │
│  │  │  2. 基础理论        │   │  │  │  🔧 工具: search_concepts     │ │ │
│  │  │    2.1 变分法 ←     │   │  │  └───────────────────────────────┘ │ │
│  │  │    2.2 最优控制     │   │  │                                     │ │
│  │  │  3. 应用            │   │  │  ┌───────────────────────────────┐ │ │
│  │  └─────────────────────┘   │  │  │         对话历史              │ │ │
│  │                             │  │  │                               │ │ │
│  │  ┌─────────────────────┐   │  │  │  👤 帮我理解变分法            │ │ │
│  │  │      文档内容        │   │  │  │                               │ │ │
│  │  │                     │   │  │  │  🤖 我来帮你梳理一下：        │ │ │
│  │  │  2.1 变分法         │   │  │  │     **核心思想**              │ │ │
│  │  │                     │   │  │  │     变分法是求泛函极值...     │ │ │
│  │  │  变分法是求解泛函    │   │  │  │                               │ │ │
│  │  │  极值问题的数学方法  │   │  │  │     [📄 查看来源]            │ │ │
│  │  │  ...                │   │  │  │                               │ │ │
│  │  │                     │   │  │  │  👤 欧拉方程怎么推导？        │ │ │
│  │  │  [选中文本会出现    │   │  │  │                               │ │ │
│  │  │   浮动工具栏:       │   │  │  │  🤖 [正在思考...]            │ │ │
│  │  │   📝笔记 ❓提问     │   │  │  └───────────────────────────────┘ │ │
│  │  │   🔍解释 📌收藏]    │   │  │                                     │ │
│  │  │                     │   │  │  ┌───────────────────────────────┐ │ │
│  │  │  $$                 │   │  │  │         输入区域              │ │ │
│  │  │  \frac{\partial}... │   │  │  │  ┌─────────────────────────┐ │ │ │
│  │  │  $$                 │   │  │  │  │ 输入你的问题...         │ │ │ │
│  │  │                     │   │  │  │  └─────────────────────────┘ │ │ │
│  │  │  [点击公式可展开    │   │  │  │  [📎 附加选中文本] [🎤] [➤] │ │ │
│  │  │   详细解释面板]     │   │  │  └───────────────────────────────┘ │ │
│  │  └─────────────────────┘   │  │                                     │ │
│  │                             │  │  ┌───────────────────────────────┐ │ │
│  │  ┌─────────────────────┐   │  │  │        快捷操作               │ │ │
│  │  │      标注/笔记       │   │  │  │  [📖 总结本章] [🔗 相关概念] │ │ │
│  │  │                     │   │  │  │  [📝 生成卡片] [🎯 练习题]   │ │ │
│  │  │  💡 "这里的推导..."  │   │  │  └───────────────────────────────┘ │ │
│  │  │  📌 重要公式        │   │  │                                     │ │
│  │  └─────────────────────┘   │  └─────────────────────────────────────┘ │
│  └─────────────────────────────┘                                          │
│                                                                            │
├────────────────────────────────────────────────────────────────────────────┤
│  [📖 阅读] [📝 笔记] [🗃️ 卡片] [📊 图谱] [📈 统计]                        │
└────────────────────────────────────────────────────────────────────────────┘
```

### 6.2 关键交互功能

```
1. 选中提问
   用户选中文本 → 浮动工具栏 → 点击"提问" → 文本自动附加到输入框

2. 公式交互
   点击公式 → 展开面板显示:
   - 符号说明
   - LLM生成的解释
   - 相关概念链接
   - "推导这个公式"按钮

3. 概念卡片
   悬浮在概念词上 → 显示概念卡片预览:
   - 定义
   - 用户掌握程度
   - 相关笔记数量
   - "深入学习"按钮

4. Agent状态可视化
   - 实时显示Agent正在执行的工具
   - 可展开查看详细的思考过程（Thought链）
   - 用户可以中途打断或引导

5. 知识图谱视图
   - 交互式力导向图
   - 节点代表概念，边代表关系
   - 点击节点跳转到相关文档位置
```

---

## 七、Django项目结构

```
scholar_mind/
├── manage.py
├── requirements.txt
├── docker-compose.yml
├── .env.example
│
├── config/                          # 项目配置
│   ├── __init__.py
│   ├── settings/
│   │   ├── base.py
│   │   ├── development.py
│   │   └── production.py
│   ├── urls.py
│   ├── wsgi.py
│   └── asgi.py                      # WebSocket支持
│
├── apps/
│   ├── users/                       # 用户系统
│   │   ├── models.py               # User, UserProfile
│   │   ├── views.py
│   │   ├── serializers.py
│   │   └── urls.py
│   │
│   ├── documents/                   # 文档管理
│   │   ├── models.py               # Document, Chunk, Formula
│   │   ├── views.py
│   │   ├── serializers.py
│   │   ├── urls.py
│   │   ├── services/
│   │   │   ├── parser.py           # 文档解析
│   │   │   ├── indexer.py          # 索引生成
│   │   │   └── renderer.py         # LaTeX渲染
│   │   └── tasks.py                # Celery异步任务
│   │
│   ├── knowledge/                   # 知识管理
│   │   ├── models.py               # Concept, ConceptRelation, Note, Flashcard
│   │   ├── views.py
│   │   ├── serializers.py
│   │   ├── urls.py
│   │   └── services/
│   │       ├── retriever.py        # 检索服务
│   │       └── graph.py            # 图谱服务
│   │
│   ├── agent/                       # AI Agent核心 ⭐
│   │   ├── models.py               # AgentTask, AgentMemory
│   │   ├── views.py
│   │   ├── urls.py
│   │   ├── core/
│   │   │   ├── planner.py          # 任务规划器
│   │   │   ├── executor.py         # ReAct执行器
│   │   │   ├── reflector.py        # 反思引擎
│   │   │   └── memory.py           # 记忆管理
│   │   ├── tools/                   # Agent工具集
│   │   │   ├── base.py             # 工具基类
│   │   │   ├── search_tools.py
│   │   │   ├── analysis_tools.py
│   │   │   ├── knowledge_tools.py
│   │   │   └── math_tools.py
│   │   ├── prompts/                 # Prompt模板
│   │   │   ├── planner_prompt.py
│   │   │   ├── executor_prompt.py
│   │   │   └── tool_prompts.py
│   │   └── consumers.py            # WebSocket消费者
│   │
│   ├── study/                       # 学习功能
│   │   ├── models.py               # StudySession, ReviewSchedule
│   │   ├── views.py
│   │   └── services/
│   │       └── spaced_repetition.py # 间隔重复算法
│   │
│   └── api/                         # API聚合
│       ├── v1/
│       │   └── urls.py
│       └── throttling.py
│
├── core/                            # 核心组件
│   ├── llm/
│   │   ├── client.py               # DeepSeek客户端
│   │   ├── prompts.py              # 通用Prompt
│   │   └── utils.py
│   ├── search/
│   │   ├── fts5.py                 # SQLite FTS5封装
│   │   └── hybrid.py               # 混合检索
│   └── utils/
│       ├── latex.py                # LaTeX处理
│       └── markdown.py             # Markdown处理
│
├── frontend/                        # 前端代码
│   ├── package.json
│   ├── vite.config.js
│   ├── src/
│   │   ├── App.jsx
│   │   ├── components/
│   │   │   ├── Reader/             # 阅读器组件
│   │   │   ├── Agent/              # Agent交互组件
│   │   │   ├── Knowledge/          # 知识库组件
│   │   │   └── Common/
│   │   ├── hooks/
│   │   ├── stores/                  # Zustand状态管理
│   │   ├── services/               # API调用
│   │   └── styles/
│   └── public/
│
├── templates/                       # Django模板（如果用HTMX）
├── static/
├── media/                           # 用户上传文件
│
├── tests/
│   ├── test_agent/
│   ├── test_documents/
│   └── test_knowledge/
│
└── scripts/
    ├── init_db.py
    └── seed_data.py
```

---

## 八、核心代码实现（关键部分）

### 8.1 Agent执行器核心

```python
# apps/agent/core/executor.py

from dataclasses import dataclass
from typing import List, Dict, Any, Optional
from enum import Enum
import json

from core.llm.client import LLMClient
from .tools import ToolRegistry


class AgentState(Enum):
    PLANNING = "planning"
    EXECUTING = "executing"
    REFLECTING = "reflecting"
    WAITING_USER = "waiting_user"
    COMPLETED = "completed"
    FAILED = "failed"


@dataclass
class ThoughtStep:
    thought: str
    action: Optional[str] = None
    action_input: Optional[Dict] = None
    observation: Optional[str] = None


class ScholarAgent:
    """
    学术AI Agent核心执行器
    实现 ReAct + Planning + Reflection 架构
    """
    
    MAX_ITERATIONS = 10
    
    def __init__(self, user_id: int, session_id: str):
        self.user_id = user_id
        self.session_id = session_id
        self.llm = LLMClient()
        self.tools = ToolRegistry()
        self.memory = AgentMemory(user_id, session_id)
        
        self.state = AgentState.PLANNING
        self.current_plan: List[str] = []
        self.execution_history: List[ThoughtStep] = []
    
    async def run(self, user_input: str, context: Dict = None) -> AsyncGenerator:
        """
        主执行循环，返回异步生成器用于流式输出
        """
        # 加载相关记忆
        relevant_memory = await self.memory.get_relevant_context(user_input)
        
        # Step 1: 规划
        self.state = AgentState.PLANNING
        yield {"type": "state", "state": "planning"}
        
        plan = await self._create_plan(user_input, relevant_memory, context)
        self.current_plan = plan
        yield {"type": "plan", "plan": plan}
        
        # Step 2: 执行 (ReAct循环)
        self.state = AgentState.EXECUTING
        iteration = 0
        final_answer = None
        
        while iteration < self.MAX_ITERATIONS:
            iteration += 1
            
            # 生成思考
            thought_result = await self._think(user_input, context)
            yield {"type": "thought", "content": thought_result}
            
            # 检查是否需要工具调用
            if thought_result.get("action"):
                action = thought_result["action"]
                action_input = thought_result["action_input"]
                
                yield {"type": "action", "tool": action, "input": action_input}
                
                # 执行工具
                observation = await self._execute_tool(action, action_input)
                yield {"type": "observation", "content": observation}
                
                # 记录执行历史
                self.execution_history.append(ThoughtStep(
                    thought=thought_result["thought"],
                    action=action,
                    action_input=action_input,
                    observation=observation
                ))
            
            # 检查是否完成
            elif thought_result.get("final_answer"):
                final_answer = thought_result["final_answer"]
                break
            
            # 检查是否需要用户输入
            elif thought_result.get("need_clarification"):
                self.state = AgentState.WAITING_USER
                yield {
                    "type": "clarification",
                    "question": thought_result["clarification_question"]
                }
                return  # 等待用户回复后继续
        
        # Step 3: 反思
        self.state = AgentState.REFLECTING
        reflection = await self._reflect(user_input, final_answer)
        yield {"type": "reflection", "content": reflection}
        
        # 如果反思认为需要改进，继续迭代
        if reflection.get("needs_improvement") and iteration < self.MAX_ITERATIONS:
            # 递归执行（带反思建议）
            async for item in self.run(user_input, {**context, "reflection": reflection}):
                yield item
            return
        
        # Step 4: 输出最终答案
        self.state = AgentState.COMPLETED
        yield {"type": "answer", "content": final_answer}
        
        # 更新记忆
        await self.memory.update(user_input, final_answer, self.execution_history)
    
    async def _create_plan(self, user_input: str, memory: Dict, context: Dict) -> List[str]:
        """
        调用LLM生成执行计划
        """
        prompt = PLANNER_PROMPT.format(
            user_input=user_input,
            user_profile=memory.get("user_profile", {}),
            session_context=memory.get("session_summary", ""),
            available_tools=self.tools.get_tool_descriptions(),
            current_document=context.get("current_document", {})
        )
        
        response = await self.llm.generate(prompt, response_format="json")
        return response.get("plan", [])
    
    async def _think(self, user_input: str, context: Dict) -> Dict:
        """
        ReAct的思考步骤
        """
        prompt = REACT_PROMPT.format(
            user_input=user_input,
            plan=self.current_plan,
            execution_history=self._format_history(),
            available_tools=self.tools.get_tool_descriptions(),
            context=context
        )
        
        response = await self.llm.generate(prompt, response_format="json")
        return response
    
    async def _execute_tool(self, tool_name: str, tool_input: Dict) -> str:
        """
        执行工具并返回观察结果
        """
        tool = self.tools.get(tool_name)
        if not tool:
            return f"Error: Tool '{tool_name}' not found"
        
        try:
            result = await tool.execute(**tool_input)
            return self._format_tool_result(result)
        except Exception as e:
            return f"Error executing {tool_name}: {str(e)}"
    
    async def _reflect(self, user_input: str, answer: str) -> Dict:
        """
        反思答案质量
        """
        prompt = REFLECTION_PROMPT.format(
            user_input=user_input,
            answer=answer,
            execution_history=self._format_history()
        )
        
        response = await self.llm.generate(prompt, response_format="json")
        return response
    
    def _format_history(self) -> str:
        """格式化执行历史"""
        formatted = []
        for i, step in enumerate(self.execution_history):
            formatted.append(f"Step {i+1}:")
            formatted.append(f"  Thought: {step.thought}")
            if step.action:
                formatted.append(f"  Action: {step.action}({step.action_input})")
                formatted.append(f"  Observation: {step.observation[:500]}...")
        return "\n".join(formatted)
```

### 8.2 WebSocket实时通信

```python
# apps/agent/consumers.py

import json
from channels.generic.websocket import AsyncWebsocketConsumer
from .core.executor import ScholarAgent


class AgentConsumer(AsyncWebsocketConsumer):
    """
    WebSocket消费者，处理Agent实时交互
    """
    
    async def connect(self):
        self.user = self.scope["user"]
        if not self.user.is_authenticated:
            await self.close()
            return
        
        self.session_id = self.scope["url_route"]["kwargs"]["session_id"]
        self.agent = ScholarAgent(self.user.id, self.session_id)
        
        await self.accept()
    
    async def disconnect(self, close_code):
        # 保存Agent状态
        pass
    
    async def receive(self, text_data):
        """
        接收用户消息并触发Agent执行
        """
        data = json.loads(text_data)
        message_type = data.get("type")
        
        if message_type == "query":
            await self.handle_query(data)
        elif message_type == "clarification_response":
            await self.handle_clarification(data)
        elif message_type == "cancel":
            await self.handle_cancel()
    
    async def handle_query(self, data):
        """处理用户查询"""
        user_input = data["content"]
        context = data.get("context", {})
        
        # 流式返回Agent执行过程
        async for event in self.agent.run(user_input, context):
            await self.send(text_data=json.dumps({
                "type": event["type"],
                "data": event
            }))
    
    async def handle_clarification(self, data):
        """处理用户对澄清问题的回复"""
        response = data["content"]
        # 继续Agent执行
        async for event in self.agent.continue_with_clarification(response):
            await self.send(text_data=json.dumps({
                "type": event["type"],
                "data": event
            }))
```

---

## 九、Prompt设计（关键）

### 9.1 规划器Prompt

```python
PLANNER_PROMPT = """
你是一个学术阅读助手的任务规划器。你需要分析用户的问题，制定执行计划。

## 用户问题
{user_input}

## 用户画像
{user_profile}

## 当前会话上下文
{session_context}

## 当前文档信息
{current_document}

## 可用工具
{available_tools}

## 你的任务
1. 分析用户问题的意图和复杂度
2. 考虑用户的知识背景
3. 制定一个清晰的执行计划

## 输出格式（JSON）
{{
    "intent_analysis": "用户意图分析",
    "complexity": "simple | medium | complex",
    "needs_retrieval": true/false,
    "needs_calculation": true/false,
    "plan": [
        "步骤1: ...",
        "步骤2: ...",
        ...
    ],
    "estimated_tools": ["tool1", "tool2"]
}}
"""
```

### 9.2 ReAct执行Prompt

```python
REACT_PROMPT = """
你是一个学术AI助手，使用ReAct方法回答问题。

## 用户问题
{user_input}

## 执行计划
{plan}

## 已执行的步骤
{execution_history}

## 可用工具
{available_tools}

## 当前上下文
{context}

## 思考指南
1. 先思考(Thought)：分析当前状态，决定下一步
2. 如果需要信息，选择一个工具执行(Action)
3. 如果信息足够，给出最终答案(Final Answer)
4. 如果问题模糊，请求澄清(Clarification)

## 输出格式（JSON，选择一种）

选项A - 需要使用工具:
{{
    "thought": "我的思考过程...",
    "action": "工具名称",
    "action_input": {{工具参数}}
}}

选项B - 可以给出答案:
{{
    "thought": "我的思考过程...",
    "final_answer": "最终答案内容..."
}}

选项C - 需要用户澄清:
{{
    "thought": "我的思考过程...",
    "need_clarification": true,
    "clarification_question": "请问您是想了解...还是...?"
}}
"""
```

---

## 十、部署与资源评估

### 10.1 最低配置方案

```yaml
# 单机部署（入门）
服务器: 2核4G云服务器
预估成本: ~100元/月

components:
  - Django + Gunicorn
  - SQLite (文档量<1000时)
  - Redis (可选，用Memcached替代)
  - 文件存储: 本地

limitations:
  - 并发用户: <50
  - 文档存储: <10GB
```

### 10.2 推荐配置方案

```yaml
# 推荐部署（正式运营）
服务器: 4核8G云服务器
预估成本: ~300元/月

components:
  - Django + Gunicorn + Nginx
  - PostgreSQL
  - Redis
  - 文件存储: 对象存储(OSS)
  - 异步任务: Celery

capabilities:
  - 并发用户: ~500
  - 文档存储: 不限
```

### 10.3 API成本估算

```
DeepSeek API（以deepseek-chat为例）：
- 输入: ¥1/百万tokens
- 输出: ¥2/百万tokens

场景分析:
1. 文档索引生成:
   - 平均文档5000字 ≈ 2500 tokens输入
   - 生成索引约1000 tokens输出
   - 成本: ¥0.005/篇

2. Agent问答:
   - 平均每次交互: 2000 tokens输入 + 800 tokens输出
   - 平均3次工具调用/问题: ~10000 tokens总计
   - 成本: ¥0.02/问题

3. 月度成本估算:
   - 100用户
   - 每用户每天5次问答
   - 每用户每周上传2篇文档
   
   问答成本: 100 × 5 × 30 × 0.02 = ¥300/月
   索引成本: 100 × 2 × 4 × 0.005 = ¥4/月
   总计: ~¥300/月
```

---

## 十一、开发路线图

### Phase 1: MVP（6-8周）
```
Week 1-2: 基础架构
  ├── Django项目初始化
  ├── 用户认证系统
  ├── 基础数据模型
  └── 前端框架搭建

Week 3-4: 文档系统
  ├── MD/TeX上传解析
  ├── LaTeX渲染
  ├── 文档分块存储
  └── LLM索引生成

Week 5-6: Agent核心
  ├── 基础ReAct循环
  ├── 3-5个核心工具
  ├── WebSocket实时通信
  └── 简单问答功能

Week 7-8: 集成测试
  ├── 端到端测试
  ├── 性能优化
  ├── Bug修复
  └── 部署上线
```

### Phase 2: 完善（8-12周）
```
- 完整工具集实现
- 笔记和卡片系统
- 用户画像系统
- 概念关系图谱
- 复习功能
- PDF支持（基础）
```

### Phase 3: 增强（12周+）
```
- 高级PDF解析（公式OCR）
- 协作功能
- 多模态支持
- 学习数据分析
- 移动端适配
```

---

## 十二、立即可以开始的第一步

如果你现在就想开始，建议从这个最小可行版本开始：

```
第一周目标:
├── Django项目 + 用户认证
├── 单个Markdown文件上传和渲染
├── 一个简单的LLM问答（不带Agent）
└── 基础前端界面

这样你可以：
1. 验证技术栈可行性
2. 快速看到成果
3. 为后续迭代建立基础
```

需要我帮你生成第一周的具体代码吗？
