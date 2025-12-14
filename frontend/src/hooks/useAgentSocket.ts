/**
 * Agent WebSocket Hook / Agent WebSocket Hook
 *
 * 管理与Agent后端的WebSocket连接和通信
 * Manages WebSocket connection and communication with Agent backend
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuthStore } from '../stores/authStore';
import type {
  WSMessage,
  WSEvent,
  QueryContext,
  UseAgentSocketReturn
} from '../types';

export function useAgentSocket(conversationId: string): UseAgentSocketReturn {
  // 连接状态 / Connection state
  const [isConnected, setIsConnected] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // WebSocket引用 / WebSocket reference
  const wsRef = useRef<WebSocket | null>(null);

  // 订阅者列表 / Subscribers list
  const subscribersRef = useRef<Set<(event: WSEvent) => void>>(new Set());

  // 认证信息 / Authentication info
  const { tokens } = useAuthStore();

  // 通知所有订阅者 / Notify all subscribers
  const notifySubscribers = useCallback((event: WSEvent) => {
    subscribersRef.current.forEach(callback => {
      try {
        callback(event);
      } catch (error) {
        console.error('Subscriber callback error:', error);
      }
    });
  }, []);

  // 建立WebSocket连接 / Establish WebSocket connection
  const connect = useCallback(() => {
    if (!tokens?.access || !conversationId) {
      setError('认证信息或对话ID缺失');
      return;
    }

    try {
      // 构建WebSocket URL / Build WebSocket URL
      const wsUrl = `${import.meta.env.VITE_WS_URL || 'ws://localhost:8000'}/ws/agent/${conversationId}/?token=${tokens.access}`;

      // 创建WebSocket连接 / Create WebSocket connection
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      // 连接打开事件 / Connection open event
      ws.onopen = () => {
        setIsConnected(true);
        setError(null);
        console.log('WebSocket connected to conversation:', conversationId);
      };

      // 接收消息事件 / Message received event
      ws.onmessage = (event) => {
        try {
          const message: WSEvent = JSON.parse(event.data);

          // 处理特殊事件 / Handle special events
          switch (message.type) {
            case 'connected':
              setIsConnected(true);
              setError(null);
              break;
            case 'error':
              setError(message.message || 'WebSocket错误');
              setIsProcessing(false);
              break;
            case 'cancelled':
              setIsProcessing(false);
              break;
          }

          // 更新处理状态 / Update processing state
          if (['state', 'plan', 'thought', 'action', 'observation'].includes(message.type)) {
            setIsProcessing(true);
          } else if (['answer', 'error', 'cancelled'].includes(message.type)) {
            setIsProcessing(false);
          }

          // 通知订阅者 / Notify subscribers
          notifySubscribers(message);

        } catch (error) {
          console.error('WebSocket message parse error:', error);
          setError('消息解析错误');
        }
      };

      // 连接关闭事件 / Connection close event
      ws.onclose = (event) => {
        setIsConnected(false);
        setIsProcessing(false);
        wsRef.current = null;

        if (!event.wasClean) {
          setError(`连接意外关闭: ${event.code}`);
        }

        console.log('WebSocket disconnected:', event.code, event.reason);
      };

      // 连接错误事件 / Connection error event
      ws.onerror = (error) => {
        setError('WebSocket连接错误');
        console.error('WebSocket error:', error);
      };

    } catch (error) {
      setError('创建WebSocket连接失败');
      console.error('WebSocket creation error:', error);
    }
  }, [tokens?.access, conversationId, notifySubscribers]);

  // 断开连接 / Disconnect
  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close(1000, 'Client disconnect');
      wsRef.current = null;
    }
    setIsConnected(false);
    setIsProcessing(false);
    setError(null);
  }, []);

  // 发送查询 / Send query
  const sendQuery = useCallback(async (content: string, context?: QueryContext) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket未连接');
    }

    const message: WSMessage = {
      type: 'query',
      content,
      context
    };

    wsRef.current.send(JSON.stringify(message));
    setIsProcessing(true);
    setError(null);
  }, []);

  // 取消任务 / Cancel task
  const cancelTask = useCallback(() => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      return;
    }

    const message: WSMessage = {
      type: 'cancel'
    };

    wsRef.current.send(JSON.stringify(message));
    setIsProcessing(false);
  }, []);

  // 设置文档 / Set document
  const setDocument = useCallback((documentId: string) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      return;
    }

    const message: WSMessage = {
      type: 'set_document',
      document_id: documentId
    };

    wsRef.current.send(JSON.stringify(message));
  }, []);

  // 订阅事件 / Subscribe to events
  const subscribe = useCallback((callback: (event: WSEvent) => void) => {
    subscribersRef.current.add(callback);

    // 返回取消订阅函数 / Return unsubscribe function
    return () => {
      subscribersRef.current.delete(callback);
    };
  }, []);

  // 取消订阅事件 / Unsubscribe from events
  const unsubscribe = useCallback((callback: (event: WSEvent) => void) => {
    subscribersRef.current.delete(callback);
  }, []);

  // 组件卸载时清理 / Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
      subscribersRef.current.clear();
    };
  }, [disconnect]);

  // conversationId变化时重新连接 / Reconnect when conversationId changes
  useEffect(() => {
    if (conversationId && tokens?.access) {
      disconnect(); // 先断开现有连接 / Disconnect existing connection first
      connect();
    }

    return () => {
      disconnect();
    };
  }, [conversationId, tokens?.access, connect, disconnect]);

  return {
    isConnected,
    isProcessing,
    error,
    sendQuery,
    cancelTask,
    setDocument,
    subscribe,
    unsubscribe
  };
}