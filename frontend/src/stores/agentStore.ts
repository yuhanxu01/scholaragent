/**
 * Agent状态管理Store / Agent State Management Store
 *
 * 管理Agent对话状态、消息历史、执行过程等
 * Manages Agent conversation state, message history, execution process, etc.
 */

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { useAgentSocket } from '../hooks/useAgentSocket';
import type {
  AgentState,
  AgentStore,
  AgentMessage,
  WSEvent,
  QueryContext,
  ToolCall
} from '../types';

const initialState: AgentState = {
  // 连接状态 / Connection state
  isConnected: false,
  isProcessing: false,
  connectionError: null,

  // 当前会话 / Current conversation
  conversationId: null,
  documentId: null,

  // 消息列表 / Message list
  messages: [],

  // 当前执行状态 / Current execution state
  executionState: 'idle',
  currentPlan: [],
  currentThought: '',
  currentToolCall: null,

  // 错误信息 / Error information
  error: null,
};

export const useAgentStore = create<AgentStore>()(
  subscribeWithSelector((set, get) => ({
    ...initialState,

    // 连接管理 / Connection management
    connect: async (conversationId: string, documentId?: string) => {
      set({
        conversationId,
        documentId: documentId || null,
        isConnected: false,
        connectionError: null,
        executionState: 'connecting'
      });
    },

    disconnect: () => {
      set({
        isConnected: false,
        isProcessing: false,
        executionState: 'idle',
        connectionError: null
      });
    },

    // 消息发送 / Message sending
    sendQuery: async (content: string, context?: QueryContext) => {
      const { conversationId, isConnected } = get();

      if (!conversationId || !isConnected) {
        set({ error: '未连接到Agent服务' });
        throw new Error('Agent未连接');
      }

      // 添加用户消息 / Add user message
      const userMessage: AgentMessage = {
        id: `user-${Date.now()}`,
        role: 'user',
        content,
        context_type: context?.type || 'none',
        context_data: context,
        timestamp: new Date().toISOString()
      };

      set(state => ({
        messages: [...state.messages, userMessage],
        isProcessing: true,
        executionState: 'executing',
        error: null
      }));

      try {
        // 使用WebSocket发送查询 / Send query via WebSocket
        // 这里将在组件中使用useAgentSocket hook / This will be used in components with useAgentSocket hook
        console.log('Sending query:', content, context);
      } catch (error: any) {
        set({
          error: error.message || '发送查询失败',
          isProcessing: false,
          executionState: 'failed'
        });
        throw error;
      }
    },

    cancelTask: () => {
      set({
        isProcessing: false,
        executionState: 'cancelled',
        currentPlan: [],
        currentThought: '',
        currentToolCall: null
      });
    },

    setDocument: (documentId: string) => {
      set({ documentId });
    },

    // 状态管理 / State management
    clearError: () => set({ error: null, connectionError: null }),

    reset: () => set(initialState),

    // 消息管理 / Message management
    addMessage: (messageData) => {
      const message: AgentMessage = {
        id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date().toISOString(),
        ...messageData
      };

      set(state => ({
        messages: [...state.messages, message]
      }));
    },

    updateMessage: (id: string, updates: Partial<AgentMessage>) => {
      set(state => ({
        messages: state.messages.map(msg =>
          msg.id === id ? { ...msg, ...updates } : msg
        )
      }));
    },

    clearMessages: () => set({ messages: [] }),
  }))
);

// WebSocket事件处理Hook / WebSocket event handling hook
export function useAgentWebSocketEvents(conversationId: string) {
  const {
    connect: storeConnect,
    disconnect: storeDisconnect,
    addMessage,
    clearError
  } = useAgentStore();

  const { subscribe } = useAgentSocket(conversationId);

  // 处理WebSocket事件 / Handle WebSocket events
  const handleWebSocketEvent = (event: WSEvent) => {
    console.log('Agent WebSocket event:', event);

    switch (event.type) {
      case 'connected':
        useAgentStore.setState({
          isConnected: true,
          connectionError: null,
          executionState: 'idle'
        });
        clearError();
        break;

      case 'state':
        useAgentStore.setState({
          executionState: event.data?.state || 'idle'
        });
        break;

      case 'plan':
        useAgentStore.setState({
          currentPlan: event.data?.plan || [],
          executionState: 'executing'
        });
        break;

      case 'thought':
        useAgentStore.setState({
          currentThought: event.data?.content || ''
        });
        break;

      case 'action':
        const toolCall: ToolCall = {
          tool_name: event.data?.tool || '',
          tool_input: event.data?.input || {},
          status: 'running'
        };
        useAgentStore.setState({
          currentToolCall: toolCall
        });
        break;

      case 'observation':
        useAgentStore.setState(state => ({
          currentToolCall: state.currentToolCall ? {
            ...state.currentToolCall,
            status: 'success',
            output: event.data?.content || ''
          } : null
        }));
        break;

      case 'answer':
        // 添加助手消息 / Add assistant message
        addMessage({
          role: 'assistant',
          content: event.data?.content || '',
          context_type: 'none'
        });

        // 重置执行状态 / Reset execution state
        useAgentStore.setState({
          isProcessing: false,
          executionState: 'completed',
          currentPlan: [],
          currentThought: '',
          currentToolCall: null
        });
        break;

      case 'error':
        useAgentStore.setState({
          error: event.message || 'Agent执行出错',
          isProcessing: false,
          executionState: 'failed',
          currentPlan: [],
          currentThought: '',
          currentToolCall: null
        });
        break;

      case 'cancelled':
        useAgentStore.setState({
          isProcessing: false,
          executionState: 'cancelled',
          currentPlan: [],
          currentThought: '',
          currentToolCall: null
        });
        break;
    }
  };

  // 订阅WebSocket事件 / Subscribe to WebSocket events
  useAgentStore.subscribe(
    (state) => state.conversationId,
    (conversationId) => {
      if (conversationId) {
        storeConnect(conversationId);
      } else {
        storeDisconnect();
      }
    }
  );

  return { handleWebSocketEvent, subscribe };
}