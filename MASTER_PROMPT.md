# ScholarMind - AI Code Agent 主执行提示词

## 🎯 项目说明

你将构建一个名为 **ScholarMind** 的学术AI Agent阅读助手Web应用。这是一个帮助理工科学生阅读和理解数理类文献的工具。

## 📋 核心功能

1. **文档管理**: 上传MD/TeX文件，解析并渲染LaTeX公式
2. **智能索引**: 调用DeepSeek API生成文档摘要、概念、关键词
3. **AI Agent对话**: 基于ReAct的智能问答，支持工具调用
4. **知识库**: 概念索引、笔记系统、复习卡片
5. **实时通信**: WebSocket实现流式回答

## 🛠 技术栈（固定）

```
后端: Python 3.11+, Django 5.0+, DRF, Channels, Celery, PostgreSQL, Redis
前端: React 18+, TypeScript, Vite, TailwindCSS, Zustand
AI: DeepSeek API
部署: Docker, Nginx, Gunicorn
```

## 📁 项目结构

```
scholarmind/
├── backend/
│   ├── config/           # Django配置
│   ├── apps/
│   │   ├── users/        # 用户系统
│   │   ├── documents/    # 文档管理
│   │   ├── knowledge/    # 知识库
│   │   ├── agent/        # AI Agent
│   │   └── study/        # 学习追踪
│   └── core/             # 核心组件(LLM客户端等)
├── frontend/
│   └── src/
│       ├── components/   # React组件
│       ├── pages/        # 页面
│       ├── hooks/        # 自定义hooks
│       ├── stores/       # Zustand状态
│       └── services/     # API服务
└── docker/               # Docker配置
```

---

## 🚀 执行步骤

请按照以下顺序执行，每完成一个Task后验证功能正常再继续。

---

### Phase 1: 基础架构

#### Task 1.1: 创建Django后端项目

```
创建Django项目，结构如下：
backend/
├── config/
│   ├── settings/
│   │   ├── base.py (通用配置)
│   │   ├── development.py
│   │   └── production.py
│   ├── urls.py
│   ├── wsgi.py
│   └── asgi.py
├── apps/
├── core/
├── manage.py
└── requirements/
    ├── base.txt
    └── development.txt

base.py 要求:
- SECRET_KEY从环境变量读取
- 配置PostgreSQL数据库
- 配置Redis缓存
- 配置REST Framework (JWT认证)
- 配置Celery
- 时区: Asia/Shanghai

requirements/base.txt:
Django>=5.0, djangorestframework>=3.14, djangorestframework-simplejwt>=5.3,
django-cors-headers>=4.3, django-environ>=0.11, psycopg2-binary>=2.9,
redis>=5.0, celery>=5.3, channels>=4.0, channels-redis>=4.1,
httpx>=0.25, markdown>=3.5, python-frontmatter>=1.0, sympy>=1.12
```

**验证**: `python manage.py check` 无错误

#### Task 1.2: 创建Users应用

```
创建apps/users/应用:

models.py:
- CustomUser(AbstractUser): email(unique), avatar, timestamps
- UserProfile: education_level, major, math_level(1-5), programming_level(1-5),
               preferences(JSON), research_interests(JSON), 统计字段

serializers.py:
- UserSerializer, UserProfileSerializer, RegisterSerializer

views.py:
- RegisterView, ProfileView, MeView

urls.py:
- register/, profile/, me/

signals.py:
- 用户创建时自动创建UserProfile

配置JWT:
- /api/token/ (获取token)
- /api/token/refresh/ (刷新token)
```

**验证**: 能注册用户、登录获取token、访问me接口

#### Task 1.3: 创建React前端项目

```bash
npm create vite@latest frontend -- --template react-ts
cd frontend
npm install react-router-dom@6 zustand axios @tanstack/react-query
npm install tailwindcss postcss autoprefixer lucide-react
npm install katex react-markdown remark-math rehype-katex
```

```
项目结构:
src/
├── components/
│   ├── common/    (Button, Input, Modal, Loading)
│   ├── layout/    (Header, Sidebar, MainLayout)
│   └── auth/      (LoginForm, RegisterForm)
├── pages/         (HomePage, LoginPage, RegisterPage, DashboardPage)
├── hooks/         (useAuth)
├── stores/        (authStore, uiStore)
├── services/      (api.ts, authService.ts)
├── types/
└── utils/         (cn.ts)

配置:
- TailwindCSS
- Axios实例(带JWT拦截器)
- Zustand认证状态
- React Router路由保护
```

**验证**: `npm run dev` 正常启动

#### Task 1.4-1.6: 登录注册、布局、Docker

```
实现:
- 登录/注册页面（美观的卡片式布局）
- MainLayout (Header + Sidebar + 内容区)
- Dashboard页面（欢迎消息、统计卡片）
- docker-compose.yml (db, redis, backend, frontend)
```

**验证**: 完整的注册-登录-访问Dashboard流程

---

### Phase 2: 文档系统

#### Task 2.1: Documents数据模型

```python
# apps/documents/models.py

class Document(Model):
    id = UUIDField(primary_key=True)
    user = ForeignKey(User)
    title = CharField(max_length=500)
    file_type = CharField(choices=['md', 'tex'])
    status = CharField(choices=['uploading', 'processing', 'ready', 'error'])
    file = FileField(upload_to='documents/%Y/%m/')
    raw_content = TextField()
    cleaned_content = TextField()
    index_data = JSONField()  # LLM生成的索引
    word_count, chunk_count, formula_count = IntegerField()
    reading_progress = FloatField(0-1)
    timestamps...

class DocumentChunk(Model):
    document = ForeignKey(Document)
    order = IntegerField()
    chunk_type = CharField(choices=['section', 'paragraph', 'theorem', ...])
    title, content, summary = TextField()
    start_line, end_line = IntegerField()

class Formula(Model):
    document = ForeignKey(Document)
    latex = TextField()
    formula_type = CharField(choices=['inline', 'display', 'equation'])
    description = TextField()
    variables = JSONField()

class DocumentSection(Model):  # 目录树
    document = ForeignKey(Document)
    parent = ForeignKey('self', null=True)
    level, order = IntegerField()
    title = CharField()
```

#### Task 2.2: 文档解析服务

```python
# apps/documents/services/parser.py

class MarkdownParser:
    """解析Markdown，提取：标题、章节、公式、内容块"""
    def parse(self, content: str) -> ParsedDocument:
        # 1. 解析frontmatter
        # 2. 提取公式（$$...$$, $...$）
        # 3. 提取章节结构（#, ##, ###）
        # 4. 分块（按章节）
        # 5. 生成清洗后内容
        pass

class LaTeXParser:
    """解析LaTeX，提取：标题、章节、公式、定理环境"""
    def parse(self, content: str) -> ParsedDocument:
        # 1. 移除注释
        # 2. 提取\title{}
        # 3. 提取\section等
        # 4. 提取equation环境和定理环境
        pass
```

#### Task 2.3: LLM索引生成

```python
# core/llm/client.py
class DeepSeekClient:
    async def generate(self, prompt, system_prompt="", temperature=0.7, 
                      max_tokens=2000, response_format="text") -> dict:
        """调用DeepSeek API"""
        pass

# apps/documents/services/indexer.py
class DocumentIndexer:
    async def generate_index(self, content: str) -> dict:
        """生成文档索引：summary, sections, concepts, keywords, difficulty..."""
        prompt = INDEX_GENERATION_PROMPT.format(content=content)
        return await llm_client.generate(prompt, response_format="json")
```

#### Task 2.4: 文档上传API + Celery任务

```python
# apps/documents/views.py
class DocumentViewSet(ModelViewSet):
    def create(self, request):
        # 1. 验证文件(类型、大小)
        # 2. 保存Document记录(status=processing)
        # 3. 触发Celery任务
        process_document_task.delay(document.id)

# apps/documents/tasks.py
@shared_task
def process_document_task(document_id):
    # 1. 读取文件内容
    # 2. 解析文档
    # 3. 保存chunks, formulas, sections
    # 4. 调用LLM生成索引
    # 5. 更新状态为ready
```

#### Task 2.5-2.6: 前端文档管理和阅读器

```
组件:
- DocumentUpload: 拖拽上传
- DocumentList: 文档列表卡片
- DocumentsPage: 文档管理页面

阅读器:
- MarkdownRenderer: 使用react-markdown + remark-math + rehype-katex
- TableOfContents: 目录导航
- SelectionToolbar: 选中文本浮动工具栏（提问、笔记、解释）
- DocumentInfo: 文档摘要/概念/关键词面板
- ReaderPage: 三栏布局（目录|内容|面板）
```

**验证**: 上传MD文件→处理→阅读器正常渲染

---

### Phase 3: AI Agent核心

#### Task 3.1: Agent数据模型

```python
class Conversation(Model):
    user = ForeignKey(User)
    document = ForeignKey(Document, null=True)
    title = CharField()
    summary = TextField()  # 压缩的历史
    message_count = IntegerField()

class Message(Model):
    conversation = ForeignKey(Conversation)
    role = CharField(choices=['user', 'assistant', 'system'])
    content = TextField()
    context_data = JSONField()  # 选中文本等上下文

class AgentTask(Model):
    conversation = ForeignKey(Conversation)
    message = ForeignKey(Message)
    status = CharField(choices=['pending', 'planning', 'executing', 'completed', 'failed'])
    plan = JSONField()
    execution_history = JSONField()
    result = TextField()

class ToolCall(Model):
    task = ForeignKey(AgentTask)
    tool_name = CharField()
    tool_input = JSONField()
    status = CharField()
    output = TextField()
```

#### Task 3.2: 工具系统

```python
# apps/agent/tools/base.py
class BaseTool(ABC):
    name: str
    description: str
    parameters: dict
    
    @abstractmethod
    async def execute(self, **kwargs) -> ToolResult:
        pass

# apps/agent/tools/registry.py
class ToolRegistry:
    @classmethod
    def register(cls, tool_class): ...
    @classmethod
    def get(cls, name): ...
    @classmethod
    def get_tool_descriptions(cls) -> str: ...

# 实现以下工具:
@ToolRegistry.register
class SearchConceptsTool(BaseTool):
    """搜索知识库中的概念"""

@ToolRegistry.register  
class SearchContentTool(BaseTool):
    """全文搜索文档内容"""

@ToolRegistry.register
class GetSectionTool(BaseTool):
    """获取文档章节"""

@ToolRegistry.register
class AnalyzeFormulaTool(BaseTool):
    """分析数学公式"""

@ToolRegistry.register
class GenerateExplanationTool(BaseTool):
    """生成详细解释"""

@ToolRegistry.register
class CreateNoteTool(BaseTool):
    """创建笔记"""

@ToolRegistry.register
class CreateFlashcardTool(BaseTool):
    """创建复习卡片"""
```

#### Task 3.3: Agent执行引擎

```python
# apps/agent/core/executor.py
class ScholarAgent:
    MAX_ITERATIONS = 8
    
    async def run(self, user_input: str, context: dict) -> AsyncGenerator:
        # 1. 获取记忆上下文
        memory_context = await self.memory.get_context(user_input)
        
        # 2. 规划 (调用LLM生成plan)
        yield {"type": "plan", "data": plan}
        
        # 3. ReAct循环
        for i in range(MAX_ITERATIONS):
            # Thought: 调用LLM思考下一步
            thought = await self._think(user_input, context)
            yield {"type": "thought", "data": thought}
            
            if "action" in thought:
                # Action: 执行工具
                result = await self._execute_tool(thought["action"], thought["action_input"])
                yield {"type": "observation", "data": result}
            elif "final_answer" in thought:
                # 完成
                yield {"type": "answer", "data": thought["final_answer"]}
                break
        
        # 4. 反思评估（可选）
```

#### Task 3.4: WebSocket通信

```python
# config/asgi.py - 配置Channels
# apps/agent/middleware.py - JWT认证中间件
# apps/agent/consumers.py

class AgentConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        # 验证JWT token
        # 验证会话权限
        await self.accept()
    
    async def receive(self, text_data):
        data = json.loads(text_data)
        if data["type"] == "query":
            async for event in self.agent.run(data["content"], data.get("context")):
                await self.send_json(event)
        elif data["type"] == "cancel":
            # 取消任务
```

#### Task 3.5: 前端Agent集成

```typescript
// hooks/useAgentSocket.ts
export function useAgentSocket(conversationId: string) {
    // WebSocket连接管理
    // sendQuery, cancelTask, subscribe
}

// stores/agentStore.ts
// 消息列表、当前计划、思考过程、执行状态

// components/agent/AgentChat.tsx
// 消息列表、思考过程显示、输入框、发送/取消按钮
```

**验证**: 能发送问题→显示思考过程→收到回答

---

### Phase 4-6: 知识管理、优化、部署

详见 04_REMAINING_PHASES.md

---

## ⚠️ 重要提醒

1. **环境变量**: 创建.env文件，包含SECRET_KEY, DATABASE_URL, REDIS_URL, DEEPSEEK_API_KEY
2. **数据库迁移**: 每次修改models后执行makemigrations和migrate
3. **错误处理**: 所有API和工具调用都要有try-catch
4. **类型安全**: 前端使用TypeScript，后端使用类型注解
5. **测试**: 关键功能写单元测试

## 🔧 调试技巧

```bash
# 后端日志
docker-compose logs -f backend

# 前端开发
npm run dev

# 数据库
docker-compose exec db psql -U postgres -d scholarmind

# Redis
docker-compose exec redis redis-cli

# Celery任务
docker-compose exec celery celery -A config inspect active
```

## 📝 提交检查清单

每个Phase完成后确认:
- [ ] 所有功能正常工作
- [ ] 无控制台错误
- [ ] 代码风格一致
- [ ] 关键功能有错误处理
- [ ] 敏感信息不在代码中

---

**开始执行吧！从Task 1.1开始，一步一步来。**
