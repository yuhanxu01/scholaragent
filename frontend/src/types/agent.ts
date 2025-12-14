/**
 * Agent相关类型定义 / Agent related type definitions
 */

// WebSocket消息类型 / WebSocket message types
export type WSMessageType =
  | 'query'      // 用户查询 / User query
  | 'cancel'     // 取消任务 / Cancel task
  | 'set_document' // 设置文档 / Set document
  | 'ping';      // 心跳 / Ping

// Agent响应事件类型 / Agent response event types
export type AgentEventType =
  | 'connected'    // 连接建立 / Connection established
  | 'state'        // 状态更新 / State update
  | 'plan'         // 执行计划 / Execution plan
  | 'thought'      // 思考过程 / Thinking process
  | 'action'       // 工具调用 / Tool action
  | 'observation'  // 工具结果 / Tool observation
  | 'answer'       // 最终回答 / Final answer
  | 'error'        // 错误信息 / Error message
  | 'cancelled';   // 任务取消 / Task cancelled

// 执行状态 / Execution states
export type ExecutionState =
  | 'idle'           // 空闲 / Idle
  | 'connecting'     // 连接中 / Connecting
  | 'loading_memory' // 加载记忆 / Loading memory
  | 'planning'       // 规划中 / Planning
  | 'executing'      // 执行中 / Executing
  | 'completed'      // 已完成 / Completed
  | 'failed'         // 失败 / Failed
  | 'cancelled';     // 已取消 / Cancelled

// 消息角色 / Message roles
export type MessageRole = 'user' | 'assistant' | 'system';

// 上下文类型 / Context types
export type ContextType = 'selection' | 'formula' | 'chunk' | 'document' | 'none';

// WebSocket消息接口 / WebSocket message interfaces
export interface WSMessage {
  type: WSMessageType;
  content?: string;
  context?: QueryContext;
  document_id?: string;
}

export interface WSEvent {
  type: AgentEventType;
  data?: any;
  message?: string;
  code?: string;
  timestamp?: string;
}

// 查询上下文 / Query context
export interface QueryContext {
  type?: ContextType;
  selection?: string;
  formula?: string;
  chunk_id?: string;
  document_id?: string;
  line_range?: string;
}

// Agent消息 / Agent message
export interface AgentMessage {
  id: string;
  role: MessageRole;
  content: string;
  context_type: ContextType;
  context_data?: QueryContext;
  timestamp: string;
  tokens?: {
    input: number;
    output: number;
  };
}

// 执行计划 / Execution plan
export interface ExecutionPlan {
  intent: string;
  needs_tools: boolean;
  plan: string[];
  estimated_tools: string[];
}

// 工具调用信息 / Tool call information
export interface ToolCall {
  tool_name: string;
  tool_input: any;
  status: 'pending' | 'running' | 'success' | 'failed';
  output?: string;
  error?: string;
  execution_time?: number;
}

// Agent状态 / Agent state
export interface AgentState {
  // 连接状态 / Connection state
  isConnected: boolean;
  isProcessing: boolean;
  connectionError: string | null;

  // 当前会话 / Current conversation
  conversationId: string | null;
  documentId: string | null;

  // 消息列表 / Message list
  messages: AgentMessage[];

  // 当前执行状态 / Current execution state
  executionState: ExecutionState;
  currentPlan: string[];
  currentThought: string;
  currentToolCall: ToolCall | null;

  // 错误信息 / Error information
  error: string | null;
}

// Agent Store接口 / Agent Store interface
export interface AgentStore extends AgentState {
  // 连接管理 / Connection management
  connect: (conversationId: string, documentId?: string) => Promise<void>;
  disconnect: () => void;

  // 消息发送 / Message sending
  sendQuery: (content: string, context?: QueryContext) => Promise<void>;
  cancelTask: () => void;
  setDocument: (documentId: string) => void;

  // 状态管理 / State management
  clearError: () => void;
  reset: () => void;

  // 消息管理 / Message management
  addMessage: (message: Omit<AgentMessage, 'id' | 'timestamp'>) => void;
  updateMessage: (id: string, updates: Partial<AgentMessage>) => void;
  clearMessages: () => void;
}

// WebSocket Hook接口 / WebSocket Hook interface
export interface UseAgentSocketReturn {
  isConnected: boolean;
  isProcessing: boolean;
  error: string | null;

  sendQuery: (content: string, context?: QueryContext) => Promise<void>;
  cancelTask: () => void;
  setDocument: (documentId: string) => void;

  subscribe: (callback: (event: WSEvent) => void) => () => void;
  unsubscribe: (callback: (event: WSEvent) => void) => void;
}

// Agent Chat组件Props / Agent Chat component props
export interface AgentChatProps {
  conversationId: string;
  documentId?: string;
  className?: string;
  placeholder?: string;
  maxHeight?: string;
}

// 消息气泡组件Props / Message bubble component props
export interface MessageBubbleProps {
  message: AgentMessage;
  className?: string;
}

// 思考过程组件Props / Thinking process component props
export interface ThinkingProcessProps {
  plan: string[];
  thought: string;
  toolCall: ToolCall | null;
  className?: string;
}