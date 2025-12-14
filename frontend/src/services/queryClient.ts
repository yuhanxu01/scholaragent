import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5分钟内数据视为新鲜
      gcTime: 30 * 60 * 1000, // 缓存保留30分钟
      refetchOnWindowFocus: false,
      retry: 1,
      refetchOnMount: false, // 禁用挂载时重新获取
      refetchOnReconnect: false, // 禁用重连时重新获取
    },
  },
});