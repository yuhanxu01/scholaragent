import { useState, useEffect, useRef, useCallback } from 'react';

interface UseWebSocketOptions {
  onConnect?: () => void;
  onDisconnect?: () => void;
  onMessage?: (message: MessageEvent) => void;
  onError?: (error: Event) => void;
  shouldReconnect?: boolean;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  onReconnect?: () => void;
}

export const useWebSocket = (
  url: string,
  options: UseWebSocketOptions = {}
) => {
  const {
    onConnect,
    onDisconnect,
    onMessage,
    onError,
    shouldReconnect = true,
    reconnectInterval = 3000,
    maxReconnectAttempts = 5,
    onReconnect
  } = options;

  const [readyState, setReadyState] = useState<number>(WebSocket.CONNECTING);
  const [lastMessage, setLastMessage] = useState<MessageEvent | null>(null);
  const webSocketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);

  const createWebSocket = useCallback(() => {
    try {
      const ws = new WebSocket(url);
      webSocketRef.current = ws;

      ws.onopen = (event) => {
        setReadyState(WebSocket.OPEN);
        reconnectAttemptsRef.current = 0;
        onConnect?.();
      };

      ws.onclose = (event) => {
        setReadyState(WebSocket.CLOSED);
        onDisconnect?.();

        // 自动重连逻辑
        if (shouldReconnect && !event.wasClean && reconnectAttemptsRef.current < maxReconnectAttempts) {
          reconnectAttemptsRef.current++;
          onReconnect?.();

          reconnectTimeoutRef.current = setTimeout(() => {
            createWebSocket();
          }, reconnectInterval);
        }
      };

      ws.onmessage = (event) => {
        setLastMessage(event);
        onMessage?.(event);
      };

      ws.onerror = (event) => {
        setReadyState(WebSocket.CLOSED);
        onError?.(event);
      };

      return ws;
    } catch (error) {
      console.error('Failed to create WebSocket:', error);
      setReadyState(WebSocket.CLOSED);
      return null;
    }
  }, [url, onConnect, onDisconnect, onMessage, onError, shouldReconnect, reconnectInterval, maxReconnectAttempts, onReconnect]);

  // 初始化WebSocket连接
  useEffect(() => {
    const ws = createWebSocket();

    return () => {
      // 清理定时器
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }

      // 关闭WebSocket连接
      if (ws) {
        ws.close();
      }
    };
  }, [createWebSocket]);

  // 发送消息
  const sendMessage = useCallback((message: string) => {
    const ws = webSocketRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(message);
      return true;
    } else {
      console.warn('WebSocket is not connected, message not sent:', message);
      return false;
    }
  }, []);

  // 手动重连
  const reconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }

    if (webSocketRef.current) {
      webSocketRef.current.close();
    }

    reconnectAttemptsRef.current = 0;
    createWebSocket();
  }, [createWebSocket]);

  // 手动断开
  const disconnect = useCallback(() => {
    shouldReconnect = false;

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }

    if (webSocketRef.current) {
      webSocketRef.current.close();
    }
  }, []);

  return {
    readyState,
    lastMessage,
    sendMessage,
    reconnect,
    disconnect,
    webSocket: webSocketRef.current
  };
};