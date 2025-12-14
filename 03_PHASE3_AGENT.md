# Phase 3: AI Agent 核心 (Sprint 5-7)

## 阶段目标
实现AI Agent的核心功能，包括任务规划、工具调用、ReAct执行循环、记忆管理和WebSocket实时通信。

---

## Task 3.1: Agent 数据模型

### AI Code Agent 提示词

```
创建apps/agent/应用，目录结构：
apps/agent/
├── models.py
├── serializers.py
├── views.py
├── urls.py
├── consumers.py        # WebSocket
├── routing.py
├── core/
│   ├── executor.py     # Agent执行器
│   ├── memory.py       # 记忆管理
│   └── prompts.py      # Prompt模板
└── tools/
    ├── base.py         # 工具基类
    ├── registry.py     # 工具注册
    ├── search_tools.py
    ├── analysis_tools.py
    └── knowledge_tools.py

models.py 定义：

class Conversation(Model):
    id = UUIDField(primary_key=True)
    user = ForeignKey(User)
    document = ForeignKey(Document, null=True)
    title = CharField(max_length=200)
    summary = TextField()  # 压缩的历史
    is_active = BooleanField(default=True)
    message_count = IntegerField(default=0)
    timestamps...

class Message(Model):
    id = UUIDField(primary_key=True)
    conversation = ForeignKey(Conversation)
    role = CharField(choices=['user', 'assistant', 'system'])
    content = TextField()
    context_type = CharField()  # 'selection', 'formula', 'chunk'
    context_data = JSONField()
    input_tokens, output_tokens = IntegerField()
    created_at = DateTimeField()

class AgentTask(Model):
    id = UUIDField(primary_key=True)
    conversation = ForeignKey(Conversation)
    message = ForeignKey(Message)
    status = CharField(choices=['pending', 'planning', 'executing', 'waiting', 'completed', 'failed'])
    plan = JSONField()  # 执行计划
    execution_history = JSONField()  # 执行历史
    result = TextField()
    error_message = TextField()
    iterations = IntegerField()
    execution_time = FloatField()
    timestamps...

class ToolCall(Model):
    id = UUIDField(primary_key=True)
    task = ForeignKey(AgentTask)
    tool_name = CharField(max_length=100)
    tool_input = JSONField()
    status = CharField(choices=['pending', 'running', 'success', 'failed'])
    output = TextField()
    error = TextField()
    execution_time = FloatField()
    created_at = DateTimeField()

class AgentMemory(Model):
    """长期记忆"""
    id = UUIDField(primary_key=True)
    user = ForeignKey(User)
    memory_type = CharField(choices=['preference', 'knowledge', 'conversation', 'feedback'])
    content = TextField()
    related_document = ForeignKey(Document, null=True)
    related_concept = CharField()
    importance = FloatField(0-1)
    access_count = IntegerField()
    timestamps...
```

---

## Task 3.2: 工具系统

### AI Code Agent 提示词

```python
# apps/agent/tools/base.py

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Dict, Any, Optional

@dataclass
class ToolResult:
    success: bool
    data: Any
    error: Optional[str] = None
    execution_time: float = 0

class BaseTool(ABC):
    name: str = ""
    description: str = ""
    parameters: Dict[str, Any] = {}
    
    @abstractmethod
    async def execute(self, **kwargs) -> ToolResult:
        pass
    
    def get_schema(self) -> Dict:
        return {
            "name": self.name,
            "description": self.description,
            "parameters": self.parameters
        }

# apps/agent/tools/registry.py

class ToolRegistry:
    _tools: Dict[str, BaseTool] = {}
    
    @classmethod
    def register(cls, tool_class):
        """装饰器注册工具"""
        tool = tool_class()
        cls._tools[tool.name] = tool
        return tool_class
    
    @classmethod
    def get(cls, name: str) -> BaseTool:
        return cls._tools.get(name)
    
    @classmethod
    def get_tool_descriptions(cls) -> str:
        """生成工具描述文本（用于Prompt）"""
        descriptions = []
        for name, tool in cls._tools.items():
            descriptions.append(f"- {name}: {tool.description}")
        return "\n".join(descriptions)

# apps/agent/tools/search_tools.py

@ToolRegistry.register
class SearchConceptsTool(BaseTool):
    name = "search_concepts"
    description = "在知识库中搜索概念定义、定理、公式"
    parameters = {
        "query": {"type": "string", "description": "搜索关键词"},
        "doc_id": {"type": "string", "description": "限定文档ID（可选）"},
        "type_filter": {"type": "string", "description": "概念类型过滤"}
    }
    
    async def execute(self, query, doc_id=None, type_filter="all", user_id=None, **kwargs):
        # 查询Concept表
        queryset = Concept.objects.filter(user_id=user_id)
        if doc_id:
            queryset = queryset.filter(document_id=doc_id)
        queryset = queryset.filter(Q(name__icontains=query) | Q(description__icontains=query))
        results = list(queryset[:10].values('name', 'concept_type', 'description'))
        return ToolResult(success=True, data={"results": results})

@ToolRegistry.register
class SearchContentTool(BaseTool):
    name = "search_content"
    description = "在文档内容中全文搜索"
    # ... 实现类似

@ToolRegistry.register
class GetSectionTool(BaseTool):
    name = "get_section"
    description = "获取文档特定章节内容"
    # ...

@ToolRegistry.register
class GetDocumentSummaryTool(BaseTool):
    name = "get_document_summary"
    description = "获取文档摘要和结构"
    # ...

# apps/agent/tools/analysis_tools.py

@ToolRegistry.register
class AnalyzeFormulaTool(BaseTool):
    name = "analyze_formula"
    description = "分析和解释数学公式"
    
    async def execute(self, latex, analysis_type="meaning", context="", **kwargs):
        prompt = f"请分析公式: ${latex}$\n分析类型: {analysis_type}"
        response = await llm_client.generate(prompt)
        return ToolResult(success=True, data={"analysis": response["content"]})

@ToolRegistry.register
class CompareConceptsTool(BaseTool):
    name = "compare_concepts"
    description = "对比多个概念的异同"
    # ...

@ToolRegistry.register
class GenerateExplanationTool(BaseTool):
    name = "generate_explanation"
    description = "生成详细解释，支持不同难度级别"
    # ...

# apps/agent/tools/knowledge_tools.py

@ToolRegistry.register
class CreateNoteTool(BaseTool):
    name = "create_note"
    description = "创建学习笔记"
    
    async def execute(self, title, content, tags=None, user_id=None, **kwargs):
        note = Note.objects.create(user_id=user_id, title=title, content=content, tags=tags or [])
        return ToolResult(success=True, data={"note_id": str(note.id)})

@ToolRegistry.register
class CreateFlashcardTool(BaseTool):
    name = "create_flashcard"
    description = "创建复习卡片"
    # ...

@ToolRegistry.register
class AskClarificationTool(BaseTool):
    name = "ask_clarification"
    description = "向用户询问澄清问题"
    
    async def execute(self, question, options=None, **kwargs):
        return ToolResult(success=True, data={
            "type": "clarification",
            "question": question,
            "options": options
        })
```

---

## Task 3.3: Agent 执行引擎

### AI Code Agent 提示词

```python
# apps/agent/core/prompts.py

SYSTEM_PROMPT = """你是ScholarMind，专业的学术阅读AI助手。
用户信息：{user_profile}
请用中文回答，保持专业友好。"""

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

# apps/agent/core/memory.py

class MemoryManager:
    def __init__(self, user_id, conversation_id):
        self.user_id = user_id
        self.conversation_id = conversation_id
        self._working_memory = {}
    
    async def get_context(self, query: str) -> Dict:
        return {
            "user_profile": await self._get_user_profile(),
            "session_summary": await self._get_session_summary(),
            "relevant_memories": await self._get_relevant_memories(query)
        }
    
    async def compress_and_save_session(self, messages):
        """将对话历史压缩为摘要"""
        # 调用LLM压缩
        pass

# apps/agent/core/executor.py

class ScholarAgent:
    MAX_ITERATIONS = 8
    
    def __init__(self, user_id, conversation_id, document_id=None):
        self.user_id = user_id
        self.conversation_id = conversation_id
        self.document_id = document_id
        self.memory = MemoryManager(user_id, conversation_id)
        self.execution_history = []
    
    async def run(self, user_input: str, context: dict) -> AsyncGenerator:
        """主执行循环，yield事件"""
        
        # 1. 获取记忆
        memory_context = await self.memory.get_context(user_input)
        
        # 2. 规划
        yield {"type": "state", "data": {"state": "planning"}}
        plan = await self._create_plan(user_input, memory_context, context)
        yield {"type": "plan", "data": plan}
        
        # 3. 如果不需要工具，直接回答
        if not plan.get("needs_tools"):
            answer = await self._direct_answer(user_input, memory_context)
            yield {"type": "answer", "data": {"content": answer}}
            return
        
        # 4. ReAct循环
        for i in range(self.MAX_ITERATIONS):
            yield {"type": "iteration", "data": {"current": i+1}}
            
            # 思考
            thought = await self._think(user_input, memory_context, context)
            yield {"type": "thought", "data": {"content": thought.get("thought", "")}}
            
            if "action" in thought:
                # 执行工具
                yield {"type": "action", "data": {"tool": thought["action"]}}
                observation = await self._execute_tool(thought["action"], thought["action_input"])
                yield {"type": "observation", "data": {"content": str(observation)[:500]}}
                
                self.execution_history.append({
                    "thought": thought["thought"],
                    "action": thought["action"],
                    "observation": observation
                })
                
            elif "final_answer" in thought:
                yield {"type": "answer", "data": {"content": thought["final_answer"]}}
                break
    
    async def _create_plan(self, user_input, memory_context, context):
        prompt = PLANNER_PROMPT.format(...)
        response = await llm_client.generate(prompt, response_format="json")
        return response["content"]
    
    async def _think(self, user_input, memory_context, context):
        prompt = REACT_PROMPT.format(...)
        response = await llm_client.generate(prompt, response_format="json")
        return response["content"]
    
    async def _execute_tool(self, tool_name, tool_input):
        tool = ToolRegistry.get(tool_name)
        if not tool:
            return f"工具不存在: {tool_name}"
        tool_input["user_id"] = self.user_id
        result = await tool.safe_execute(**tool_input)
        return result.data if result.success else result.error
```

---

## Task 3.4: WebSocket 实时通信

### AI Code Agent 提示词

```python
# config/asgi.py
from channels.routing import ProtocolTypeRouter, URLRouter
from apps.agent.routing import websocket_urlpatterns
from apps.agent.middleware import JWTAuthMiddleware

application = ProtocolTypeRouter({
    "http": get_asgi_application(),
    "websocket": JWTAuthMiddleware(URLRouter(websocket_urlpatterns)),
})

# apps/agent/middleware.py
class JWTAuthMiddleware(BaseMiddleware):
    async def __call__(self, scope, receive, send):
        # 从query string获取token
        query_string = scope.get('query_string', b'').decode()
        params = dict(x.split('=') for x in query_string.split('&') if '=' in x)
        token = params.get('token', '')
        
        if token:
            scope['user'] = await self.get_user_from_token(token)
        else:
            scope['user'] = AnonymousUser()
        
        return await super().__call__(scope, receive, send)

# apps/agent/routing.py
websocket_urlpatterns = [
    re_path(r'ws/agent/(?P<conversation_id>[^/]+)/$', AgentConsumer.as_asgi()),
]

# apps/agent/consumers.py
class AgentConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.user = self.scope.get('user')
        if isinstance(self.user, AnonymousUser):
            await self.close(code=4001)
            return
        
        self.conversation_id = self.scope['url_route']['kwargs']['conversation_id']
        await self.accept()
        await self.send_json({"type": "connected"})
    
    async def receive(self, text_data):
        data = json.loads(text_data)
        
        if data["type"] == "query":
            self.agent = ScholarAgent(self.user.id, self.conversation_id, self.document_id)
            async for event in self.agent.run(data["content"], data.get("context", {})):
                await self.send_json(event)
        
        elif data["type"] == "cancel":
            # 取消当前任务
            pass
        
        elif data["type"] == "set_document":
            self.document_id = data["document_id"]
    
    async def send_json(self, data):
        await self.send(text_data=json.dumps(data, ensure_ascii=False))
```

---

## Task 3.5: 前端 Agent 集成

### AI Code Agent 提示词

```typescript
// src/hooks/useAgentSocket.ts
export function useAgentSocket(conversationId: string) {
  const [isConnected, setIsConnected] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const accessToken = useAuthStore((state) => state.accessToken);

  const connect = useCallback(() => {
    const wsUrl = `${import.meta.env.VITE_WS_URL}/ws/agent/${conversationId}/?token=${accessToken}`;
    const ws = new WebSocket(wsUrl);
    
    ws.onopen = () => setIsConnected(true);
    ws.onclose = () => setIsConnected(false);
    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      // 通知订阅者
    };
    
    wsRef.current = ws;
  }, [conversationId, accessToken]);

  const sendQuery = useCallback((content: string, context?: any) => {
    wsRef.current?.send(JSON.stringify({ type: 'query', content, context }));
  }, []);

  const cancelTask = useCallback(() => {
    wsRef.current?.send(JSON.stringify({ type: 'cancel' }));
  }, []);

  return { isConnected, isProcessing, sendQuery, cancelTask, subscribe };
}

// src/stores/agentStore.ts
interface AgentState {
  messages: Message[];
  currentPlan: string[];
  currentThought: string;
  isProcessing: boolean;
  // actions...
}

// src/components/agent/AgentChat.tsx
export function AgentChat({ conversationId, documentId }) {
  const [input, setInput] = useState('');
  const { messages, currentPlan, currentThought, isProcessing } = useAgentStore();
  const { sendQuery, cancelTask, subscribe } = useAgentSocket(conversationId);

  useEffect(() => {
    return subscribe((message) => {
      switch (message.type) {
        case 'plan': setPlan(message.data.plan); break;
        case 'thought': setThought(message.data.content); break;
        case 'answer': addMessage({role: 'assistant', content: message.data.content}); break;
      }
    });
  }, []);

  return (
    <div className="flex flex-col h-full">
      {/* 消息列表 */}
      <div className="flex-1 overflow-y-auto">
        {messages.map(msg => <MessageBubble key={msg.id} message={msg} />)}
        
        {/* 思考过程 */}
        {isProcessing && currentPlan.length > 0 && (
          <div className="bg-blue-50 p-3 rounded">
            <div className="font-medium">📋 执行计划</div>
            <ol>{currentPlan.map((s, i) => <li key={i}>{s}</li>)}</ol>
          </div>
        )}
        {currentThought && (
          <div className="text-gray-600">
            <Brain className="animate-pulse" /> {currentThought}
          </div>
        )}
      </div>
      
      {/* 输入框 */}
      <form onSubmit={handleSubmit}>
        <textarea value={input} onChange={e => setInput(e.target.value)} />
        {isProcessing ? (
          <button onClick={cancelTask}><StopCircle /></button>
        ) : (
          <button type="submit"><Send /></button>
        )}
      </form>
    </div>
  );
}
```

---

## Phase 3 验收检查清单

- [ ] Agent数据模型创建完成（Conversation, Message, AgentTask, ToolCall）
- [ ] 工具系统实现完成
  - [ ] search_concepts
  - [ ] search_content
  - [ ] get_section
  - [ ] analyze_formula
  - [ ] generate_explanation
  - [ ] create_note
  - [ ] create_flashcard
- [ ] Agent执行引擎实现完成
  - [ ] 任务规划
  - [ ] ReAct循环
  - [ ] 工具调用
- [ ] WebSocket通信实现完成
  - [ ] JWT认证
  - [ ] 消息收发
  - [ ] 任务取消
- [ ] 前端Agent对话组件实现完成
- [ ] 与阅读器集成完成
- [ ] 端到端问答测试通过
