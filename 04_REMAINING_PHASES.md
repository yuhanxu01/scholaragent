
# Phase 4-6 & 规范文档汇总

由于完整文档内容较长，这里提供各阶段的核心要点和关键提示词。

---

# Phase 4: 知识管理系统

## Task 4.1: Knowledge应用数据模型

### AI Code Agent 提示词摘要

```
创建apps/knowledge/应用，包含以下模型：

1. Concept模型 - 概念索引
   - 字段：name, concept_type, description, formula, document(FK), 
           location_section, location_line, prerequisites(JSON), related_concepts(JSON)
   - 支持类型：definition, theorem, lemma, method, formula, other

2. ConceptRelation模型 - 概念关系
   - 字段：source_concept(FK), target_concept(FK), relation_type, confidence, source
   - 关系类型：prerequisite, related, extends, example_of, part_of, contrast

3. Note模型 - 用户笔记
   - 字段：user(FK), document(FK), title, content, tags(JSON), 
           linked_concepts(M2M), chunk(FK), is_public

4. Flashcard模型 - 复习卡片
   - 字段：user(FK), front, back, tags(JSON), difficulty, 
           next_review_date, review_count, ease_factor
   - 实现SM-2间隔重复算法

5. Highlight模型 - 文档高亮标注
   - 字段：user(FK), document(FK), chunk(FK), text, color, note
```

## Task 4.2: 检索服务实现

```python
# apps/knowledge/services/retriever.py 核心逻辑

class HybridRetriever:
    """混合检索器"""
    
    def search(self, query: str, user_id: int, doc_id: str = None) -> List[SearchResult]:
        """
        多路召回：
        1. 概念名精确匹配 (权重1.0)
        2. SQLite FTS5全文检索 (权重0.8)
        3. 关键词匹配 (权重0.6)
        4. 章节摘要匹配 (权重0.4)
        
        然后去重、排序返回Top-K结果
        """
        pass
    
    def search_concepts(self, query: str, user_id: int, filters: dict = None) -> List[Concept]:
        """概念搜索"""
        pass
    
    def get_related_concepts(self, concept_id: str, depth: int = 2) -> Dict:
        """获取概念关系图"""
        pass
```

## Task 4.3: 前端知识库页面

```
实现以下组件：
- KnowledgePage: 知识库主页面
- ConceptList: 概念列表（支持搜索、过滤）
- ConceptCard: 概念卡片（显示定义、来源、相关概念）
- ConceptGraph: 概念关系可视化（使用react-force-graph或vis.js）
- NoteEditor: 笔记编辑器（支持Markdown）
- FlashcardReview: 卡片复习界面
```

---

# Phase 5: 集成优化

## Task 5.1: 性能优化

```
1. 数据库优化
   - 添加适当索引
   - 使用select_related/prefetch_related减少查询
   - 对大文本字段使用延迟加载

2. 缓存策略
   - Redis缓存热点数据（用户画像、最近文档）
   - LLM响应缓存（相同问题的答案）
   - 前端React Query缓存

3. 异步处理
   - 文档处理使用Celery
   - 索引更新后台进行
   - 批量操作队列化
```

## Task 5.2: 错误处理和日志

```python
# core/exceptions.py
class ScholarMindException(Exception):
    """基础异常类"""
    pass

class DocumentProcessingError(ScholarMindException):
    """文档处理错误"""
    pass

class LLMServiceError(ScholarMindException):
    """LLM服务错误"""
    pass

class ToolExecutionError(ScholarMindException):
    """工具执行错误"""
    pass

# 配置结构化日志
LOGGING = {
    'version': 1,
    'handlers': {
        'console': {...},
        'file': {...},
        'json_file': {...}  # JSON格式便于分析
    },
    'loggers': {
        'agent': {'level': 'INFO'},
        'documents': {'level': 'INFO'},
        'llm': {'level': 'DEBUG'}
    }
}
```

## Task 5.3: API文档和测试

```
1. API文档
   - 使用drf-spectacular生成OpenAPI规范
   - 配置Swagger UI和ReDoc

2. 测试覆盖
   - 单元测试：models, services, tools
   - 集成测试：API endpoints
   - E2E测试：关键用户流程
   
# 测试示例
class TestDocumentUpload(APITestCase):
    def test_upload_markdown_file(self):
        ...
    
    def test_upload_invalid_file_type(self):
        ...

class TestAgentExecution(TestCase):
    async def test_simple_query(self):
        ...
    
    async def test_tool_execution(self):
        ...
```

---

# Phase 6: 部署上线

## Task 6.1: Docker生产配置

```yaml
# docker-compose.prod.yml
version: '3.8'

services:
  nginx:
    image: nginx:alpine
    volumes:
      - ./nginx/nginx.prod.conf:/etc/nginx/nginx.conf
      - static_volume:/app/static
      - media_volume:/app/media
    ports:
      - "80:80"
      - "443:443"
    depends_on:
      - backend

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile.prod
    command: gunicorn config.wsgi:application --bind 0.0.0.0:8000 --workers 4
    environment:
      - DJANGO_SETTINGS_MODULE=config.settings.production
    env_file:
      - .env.prod

  celery:
    build:
      context: ./backend
      dockerfile: Dockerfile.prod
    command: celery -A config worker -l info --concurrency=2

  channels:
    build:
      context: ./backend
      dockerfile: Dockerfile.prod
    command: daphne -b 0.0.0.0 -p 8001 config.asgi:application
```

## Task 6.2: 环境变量和安全配置

```
# .env.prod 模板
DEBUG=False
SECRET_KEY=<生成强密钥>
DATABASE_URL=postgres://user:pass@db:5432/scholarmind
REDIS_URL=redis://redis:6379/0
DEEPSEEK_API_KEY=<your-api-key>

ALLOWED_HOSTS=yourdomain.com,www.yourdomain.com
CORS_ALLOWED_ORIGINS=https://yourdomain.com

# 安全设置
SECURE_SSL_REDIRECT=True
SESSION_COOKIE_SECURE=True
CSRF_COOKIE_SECURE=True
```

## Task 6.3: CI/CD配置

```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Run tests
        run: |
          docker-compose -f docker-compose.test.yml up --abort-on-container-exit

  deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to server
        run: |
          ssh user@server 'cd /app && git pull && docker-compose -f docker-compose.prod.yml up -d --build'
```

---

# 完整数据模型参考 (07_DATA_MODELS.md)

```python
# 所有模型的完整字段定义

# === Users App ===
class CustomUser(AbstractUser):
    email = EmailField(unique=True)
    avatar = ImageField(upload_to='avatars/', null=True)
    created_at = DateTimeField(auto_now_add=True)
    updated_at = DateTimeField(auto_now=True)

class UserProfile(Model):
    user = OneToOneField(CustomUser)
    education_level = CharField(choices=[...])
    major = CharField()
    math_level = IntegerField(1-5)
    programming_level = IntegerField(1-5)
    preferences = JSONField()
    research_interests = JSONField()
    # 统计字段...

# === Documents App ===
class Document(Model):
    id = UUIDField(primary_key=True)
    user = ForeignKey(User)
    title = CharField()
    file_type = CharField(choices=['md', 'tex', 'pdf'])
    status = CharField(choices=['uploading', 'processing', 'ready', 'error'])
    raw_content = TextField()
    cleaned_content = TextField()
    index_data = JSONField()  # LLM生成的索引
    # 统计和时间戳字段...

class DocumentChunk(Model):
    document = ForeignKey(Document)
    order = IntegerField()
    chunk_type = CharField()
    title = CharField()
    content = TextField()
    summary = TextField()

class Formula(Model):
    document = ForeignKey(Document)
    chunk = ForeignKey(DocumentChunk, null=True)
    latex = TextField()
    formula_type = CharField()
    description = TextField()
    variables = JSONField()

# === Knowledge App ===
class Concept(Model):
    user = ForeignKey(User)
    document = ForeignKey(Document, null=True)
    name = CharField()
    concept_type = CharField()
    description = TextField()
    formula = TextField(blank=True)
    prerequisites = JSONField()
    related_concepts = JSONField()

class Note(Model):
    user = ForeignKey(User)
    document = ForeignKey(Document, null=True)
    title = CharField()
    content = TextField()
    tags = JSONField()

class Flashcard(Model):
    user = ForeignKey(User)
    front = TextField()
    back = TextField()
    tags = JSONField()
    difficulty = IntegerField()
    next_review_date = DateField()
    ease_factor = FloatField(default=2.5)

# === Agent App ===
class Conversation(Model):
    user = ForeignKey(User)
    document = ForeignKey(Document, null=True)
    title = CharField()
    summary = TextField()
    message_count = IntegerField()

class Message(Model):
    conversation = ForeignKey(Conversation)
    role = CharField(choices=['user', 'assistant', 'system'])
    content = TextField()
    context_data = JSONField()

class AgentTask(Model):
    conversation = ForeignKey(Conversation)
    message = ForeignKey(Message)
    status = CharField()
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

---

# API规范参考 (08_API_SPECIFICATION.md)

## REST API 端点

```
# 用户认证
POST   /api/token/                    # 获取JWT Token
POST   /api/token/refresh/            # 刷新Token
POST   /api/users/register/           # 用户注册
GET    /api/users/me/                 # 当前用户信息
PUT    /api/users/profile/            # 更新用户画像

# 文档管理
GET    /api/documents/                # 文档列表
POST   /api/documents/                # 上传文档
GET    /api/documents/{id}/           # 文档详情
DELETE /api/documents/{id}/           # 删除文档
GET    /api/documents/{id}/content/   # 获取文档内容
GET    /api/documents/{id}/chunks/    # 获取文档分块
POST   /api/documents/{id}/reprocess/ # 重新处理

# 知识库
GET    /api/knowledge/concepts/       # 概念列表
GET    /api/knowledge/concepts/{id}/  # 概念详情
GET    /api/knowledge/concepts/{id}/graph/ # 概念关系图
GET    /api/knowledge/notes/          # 笔记列表
POST   /api/knowledge/notes/          # 创建笔记
GET    /api/knowledge/flashcards/     # 卡片列表
POST   /api/knowledge/flashcards/     # 创建卡片
POST   /api/knowledge/flashcards/{id}/review/ # 复习卡片
GET    /api/knowledge/search/         # 知识搜索

# Agent会话
GET    /api/agent/conversations/      # 会话列表
POST   /api/agent/conversations/      # 创建会话
GET    /api/agent/conversations/{id}/ # 会话详情
GET    /api/agent/conversations/{id}/messages/ # 消息列表
DELETE /api/agent/conversations/{id}/ # 删除会话
```

## WebSocket 端点

```
# Agent实时对话
ws://host/ws/agent/{conversation_id}/?token={jwt_token}

# 消息格式
发送: {"type": "query", "content": "问题内容", "context": {...}}
发送: {"type": "cancel"}
发送: {"type": "set_document", "document_id": "xxx"}

接收: {"type": "connected", "data": {...}}
接收: {"type": "plan", "data": {"plan": [...]}}
接收: {"type": "thought", "data": {"content": "..."}}
接收: {"type": "action", "data": {"tool": "...", "input": {...}}}
接收: {"type": "observation", "data": {"content": "..."}}
接收: {"type": "answer", "data": {"content": "..."}}
接收: {"type": "error", "data": {"message": "..."}}
```

---

# Prompt模板参考 (10_PROMPTS_TEMPLATES.md)

## 文档索引生成Prompt

```
请分析以下学术文档内容，生成结构化的索引信息。

文档内容：
{content}

请提取并生成以下信息（JSON格式）：
1. summary: 文档摘要（200字以内）
2. sections: 章节摘要列表
3. concepts: 核心概念列表（name, type, description, prerequisites, related）
4. formulas: 重要公式说明
5. keywords: 关键词（10-20个）
6. difficulty: 难度等级（1-5）
7. prerequisites: 阅读前置知识
8. domain: 所属领域
```

## Agent系统Prompt

```
你是ScholarMind，一个专业的学术阅读AI助手。

你的能力：
1. 解释复杂的学术概念
2. 追溯知识的前置依赖
3. 创建学习笔记和复习卡片
4. 根据用户水平调整解释深度

当前用户信息：
{user_profile}

请用中文回答，保持专业和友好。
```

## ReAct执行Prompt

```
你正在执行学术问答任务。使用ReAct方法循环执行。

用户问题：{user_input}
执行计划：{plan}
已执行步骤：{execution_history}
可用工具：{tools_description}

输出格式（JSON）：
- 需要工具：{"thought": "...", "action": "tool_name", "action_input": {...}}
- 给出答案：{"thought": "...", "final_answer": "..."}
```

---

# 执行顺序总结

```
Week 1-2: Phase 1 (基础架构)
  ├── Task 1.1: Django项目初始化
  ├── Task 1.2: Users应用
  ├── Task 1.3: React项目初始化
  ├── Task 1.4: 登录注册页面
  ├── Task 1.5: 基础布局组件
  └── Task 1.6: Docker配置

Week 3-4: Phase 2 (文档系统)
  ├── Task 2.1: Documents数据模型
  ├── Task 2.2: 文档解析服务
  ├── Task 2.3: LLM索引生成
  ├── Task 2.4: 文档上传API
  ├── Task 2.5: 前端文档管理
  └── Task 2.6: 前端阅读器

Week 5-7: Phase 3 (AI Agent)
  ├── Task 3.1: Agent数据模型
  ├── Task 3.2: 工具系统
  ├── Task 3.3: 执行引擎
  ├── Task 3.4: WebSocket通信
  └── Task 3.5: 前端Agent集成

Week 8-9: Phase 4 (知识管理)
  ├── Task 4.1: Knowledge数据模型
  ├── Task 4.2: 检索服务
  └── Task 4.3: 前端知识库

Week 10-11: Phase 5 (集成优化)
  ├── Task 5.1: 性能优化
  ├── Task 5.2: 错误处理
  └── Task 5.3: 测试覆盖

Week 12: Phase 6 (部署上线)
  ├── Task 6.1: Docker生产配置
  ├── Task 6.2: 安全配置
  └── Task 6.3: CI/CD
```

---

完整项目估计代码量：
- 后端Python: ~8000-10000行
- 前端TypeScript/React: ~6000-8000行
- 配置和脚本: ~1000行

建议AI Code Agent执行策略：
1. 每次执行一个Task
2. 执行后验证功能正常
3. 遇到问题记录并调整
4. 保持代码风格一致
