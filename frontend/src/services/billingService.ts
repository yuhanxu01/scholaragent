import { api } from './api';
import { toast } from 'react-hot-toast';

// Token使用统计相关类型
export interface UserTokenStats {
  total_input_tokens: number;
  total_output_tokens: number;
  total_tokens: number;
  api_call_count: number;
  last_updated: string | null;
}

export interface SystemTokenStats {
  date: string;
  daily_input_tokens: number;
  daily_output_tokens: number;
  daily_total_tokens: number;
  daily_api_calls: number;
  total_input_tokens: number;
  total_output_tokens: number;
  total_tokens: number;
  total_api_calls: number;
}

export interface TokenUsageRecord {
  id: number;
  api_type: string;
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  created_at: string;
  metadata: Record<string, any>;
}

export interface DashboardStats {
  user_stats: UserTokenStats;
  today_stats: SystemTokenStats;
  recent_records: TokenUsageRecord[];
}

class BillingService {
  // 获取用户token使用统计
  async getUserStats(): Promise<UserTokenStats> {
    try {
      const response = await api.get<UserTokenStats>('/billing/token-usage/user_stats/');
      console.log('User stats response:', response); // Debug log
      return response;
    } catch (error: any) {
      console.error('Failed to fetch user token stats:', error);
      console.error('Error details:', {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data
      });

      // 提供更具体的错误信息
      if (error.response?.status === 401) {
        toast.error('请先登录后再查看Token使用统计');
      } else if (error.response?.status === 403) {
        toast.error('您没有权限查看Token使用统计');
      } else if (error.response?.status >= 500) {
        toast.error('服务器暂时无法获取Token统计，请稍后重试');
      } else if (error.code === 'NETWORK_ERROR') {
        toast.error('网络连接失败，请检查网络后重试');
      } else {
        // 对于其他错误，不要显示toast，让组件处理
        console.warn('User stats fetch failed, returning default values');
      }

      // 返回默认值，避免前端崩溃
      return {
        total_input_tokens: 0,
        total_output_tokens: 0,
        total_tokens: 0,
        api_call_count: 0,
        last_updated: null
      };
    }
  }

  // 获取系统token使用统计
  async getSystemStats(date?: string): Promise<SystemTokenStats> {
    try {
      const params = date ? { date } : {};
      return await api.get<SystemTokenStats>('/billing/token-usage/system_stats/', { params });
    } catch (error: any) {
      console.error('Failed to fetch system token stats:', error);
      
      if (error.response?.status === 401) {
        toast.error('请先登录后再查看系统统计');
      } else if (error.response?.status === 403) {
        toast.error('您没有权限查看系统统计');
      } else if (error.response?.status >= 500) {
        toast.error('服务器暂时无法获取系统统计，请稍后重试');
      } else {
        toast.error('获取系统统计失败，请稍后重试');
      }
      
      // 返回默认值
      const today = new Date().toISOString().split('T')[0];
      return {
        date: date || today,
        daily_input_tokens: 0,
        daily_output_tokens: 0,
        daily_total_tokens: 0,
        daily_api_calls: 0,
        total_input_tokens: 0,
        total_output_tokens: 0,
        total_tokens: 0,
        total_api_calls: 0
      };
    }
  }

  // 获取用户token使用记录
  async getUserRecords(apiType?: string, limit: number = 20): Promise<TokenUsageRecord[]> {
    try {
      const params: any = { limit };
      if (apiType) {
        params.api_type = apiType;
      }
      return await api.get<TokenUsageRecord[]>('/billing/token-usage/user_records/', { params });
    } catch (error: any) {
      console.error('Failed to fetch user token records:', error);
      
      if (error.response?.status === 401) {
        toast.error('请先登录后再查看使用记录');
      } else if (error.response?.status === 403) {
        toast.error('您没有权限查看使用记录');
      } else if (error.response?.status === 400) {
        toast.error('请求参数错误，请检查筛选条件');
      } else if (error.response?.status >= 500) {
        toast.error('服务器暂时无法获取使用记录，请稍后重试');
      } else {
        toast.error('获取使用记录失败，请稍后重试');
      }
      
      // 返回空数组
      return [];
    }
  }

  // 获取仪表板统计数据
  async getDashboardStats(): Promise<DashboardStats> {
    try {
      const response = await api.get<DashboardStats>('/billing/token-usage/dashboard_stats/');
      console.log('Dashboard stats response:', response); // Debug log
      console.log('User tokens:', response.user_stats?.total_tokens); // Debug log
      return response;
    } catch (error: any) {
      console.error('Failed to fetch dashboard stats:', error);
      console.error('Error details:', {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data
      });

      // 只有在真正的认证/权限错误时才显示toast
      if (error.response?.status === 401) {
        toast.error('请先登录后再查看统计数据');
      } else if (error.response?.status === 403) {
        toast.error('您没有权限查看统计数据');
      } else if (error.response?.status >= 500) {
        toast.error('服务器暂时无法获取统计数据，请稍后重试');
      } else if (error.code === 'NETWORK_ERROR' || error.code === 'ECONNABORTED') {
        toast.error('网络连接失败，请检查网络后重试');
      } else {
        // 对于其他错误，不要显示toast，让组件处理
        console.warn('Dashboard stats fetch failed, returning default values');
      }

      // 返回默认值，但添加错误信息以便调试
      const today = new Date().toISOString().split('T')[0];
      return {
        user_stats: {
          total_input_tokens: 0,
          total_output_tokens: 0,
          total_tokens: 0,
          api_call_count: 0,
          last_updated: null
        },
        today_stats: {
          date: today,
          daily_input_tokens: 0,
          daily_output_tokens: 0,
          daily_total_tokens: 0,
          daily_api_calls: 0,
          total_input_tokens: 0,
          total_output_tokens: 0,
          total_tokens: 0,
          total_api_calls: 0
        },
        recent_records: []
      };
    }
  }

  // 格式化token数量显示
  formatTokenCount(tokens: number | undefined | null): string {
    if (tokens == null || tokens === undefined || isNaN(tokens)) {
      return '0';
    }
    if (tokens >= 1000000) {
      return `${(tokens / 1000000).toFixed(1)}M`;
    } else if (tokens >= 1000) {
      return `${(tokens / 1000).toFixed(1)}K`;
    }
    return tokens.toString();
  }

  // 格式化API类型显示
  formatApiType(apiType: string): string {
    const typeMap: Record<string, string> = {
      'ai_chat': 'AI聊天',
      'agent_execution': 'Agent执行',
      'document_index': '文档索引',
      'other': '其他'
    };
    return typeMap[apiType] || apiType;
  }

  // 计算token使用成本（假设每1000个token的价格）
  calculateCost(tokens: number, pricePerThousand: number = 0.002): number {
    return (tokens / 1000) * pricePerThousand;
  }

  // 格式化成本显示
  formatCost(cost: number): string {
    return `$${cost.toFixed(4)}`;
  }
}

export const billingService = new BillingService();
export default billingService;
