import React, { useState, useEffect } from 'react';
import { Button } from '../common/Button';
import { AlertCircle, TrendingUp, Zap, Calendar, RefreshCw } from 'lucide-react';
import { toast } from 'react-hot-toast';
import billingService, {
  type UserTokenStats,
  type TokenUsageRecord,
  type DashboardStats
} from '../../services/billingService';

const TokenUsageStats: React.FC = () => {
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [userRecords, setUserRecords] = useState<TokenUsageRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'details'>('overview');

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setLoading(true);
      const [stats, records] = await Promise.all([
        billingService.getDashboardStats(),
        billingService.getUserRecords(undefined, 10)
      ]);
      setDashboardStats(stats);
      setUserRecords(records);
    } catch (error) {
      console.error('Failed to load token stats:', error);
      toast.error('加载token统计失败');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      await loadStats();
      toast.success('统计数据已更新');
    } catch (error) {
      // Error already handled in loadStats
    } finally {
      setRefreshing(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('zh-CN');
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="flex items-center gap-2 mb-4">
          <Zap className="h-5 w-5" />
          <h3 className="text-lg font-semibold">Token使用统计</h3>
        </div>
        <p className="text-gray-600 dark:text-gray-500 mb-4">正在加载统计数据...</p>
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 dark:bg-gray-200 rounded w-3/4"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-200 rounded w-1/2"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-200 rounded w-2/3"></div>
        </div>
      </div>
    );
  }

  if (!dashboardStats) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="flex items-center gap-2 mb-4">
          <AlertCircle className="h-5 w-5 text-red-500" />
          <h3 className="text-lg font-semibold">Token使用统计</h3>
        </div>
        <p className="text-gray-600 dark:text-gray-500 mb-4">无法加载统计数据</p>
        <Button onClick={loadStats} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          重试
        </Button>
      </div>
    );
  }

  const {
    user_stats = {
      total_input_tokens: 0,
      total_output_tokens: 0,
      total_tokens: 0,
      api_call_count: 0,
      last_updated: null
    },
    today_stats = {
      date: new Date().toISOString().split('T')[0],
      daily_input_tokens: 0,
      daily_output_tokens: 0,
      daily_total_tokens: 0,
      daily_api_calls: 0,
      total_input_tokens: 0,
      total_output_tokens: 0,
      total_tokens: 0,
      total_api_calls: 0
    },
    recent_records = []
  } = dashboardStats || {};

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            <h3 className="text-lg font-semibold">Token使用统计</h3>
          </div>
          <p className="text-gray-600 dark:text-gray-500 text-sm">您的AI服务使用情况和费用统计</p>
        </div>
        <Button
          onClick={handleRefresh}
          disabled={refreshing}
          variant="outline"
          size="sm"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          刷新
        </Button>
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b mb-6">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 text-sm font-medium ${
            activeTab === 'overview'
              ? 'border-b-2 border-blue-500 text-blue-600'
              : 'text-gray-500 hover:text-gray-700 dark:text-gray-300'
          }`}
        >
          总览
        </button>
        <button
          onClick={() => setActiveTab('details')}
          className={`px-4 py-2 text-sm font-medium ${
            activeTab === 'details'
              ? 'border-b-2 border-blue-500 text-blue-600'
              : 'text-gray-500 hover:text-gray-700 dark:text-gray-300'
          }`}
        >
          详细记录
        </button>
      </div>

      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* 用户统计卡片 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
              <h4 className="text-sm font-medium text-gray-600 dark:text-gray-500 mb-2">总Token使用</h4>
              <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {billingService.formatTokenCount(user_stats.total_tokens)}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                输入: {billingService.formatTokenCount(user_stats.total_input_tokens)} |
                输出: {billingService.formatTokenCount(user_stats.total_output_tokens)}
              </p>
            </div>

            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
              <h4 className="text-sm font-medium text-gray-600 dark:text-gray-500 mb-2">API调用次数</h4>
              <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {user_stats.api_call_count || 0}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                平均每次约 {(user_stats.api_call_count || 0) > 0 ?
                  Math.round((user_stats.total_tokens || 0) / (user_stats.api_call_count || 1)) : 0} tokens
              </p>
            </div>

            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
              <h4 className="text-sm font-medium text-gray-600 dark:text-gray-500 mb-2">今日使用</h4>
              <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {billingService.formatTokenCount(today_stats.daily_total_tokens)}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                {today_stats.daily_api_calls || 0} 次调用
              </p>
            </div>
          </div>

          {/* 使用趋势 */}
          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="h-4 w-4" />
              <h4 className="text-sm font-medium">使用趋势</h4>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>今日进度</span>
                <span>
                  {today_stats.daily_total_tokens || 0} / {Math.max((today_stats.daily_total_tokens || 0) * 1.2, 10000)} tokens
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full"
                  style={{
                    width: `${Math.min(Math.max(((today_stats.daily_total_tokens || 0) / Math.max((today_stats.daily_total_tokens || 0) * 1.2, 10000)) * 100, 0), 100)}%`
                  }}
                ></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'details' && (
        <div className="space-y-4">
          {/* 最近记录 */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="h-4 w-4" />
              <h4 className="text-sm font-medium">最近使用记录</h4>
            </div>
            <p className="text-gray-600 dark:text-gray-500 text-sm mb-4">
              显示最近10次API调用的token使用情况
            </p>

            {userRecords.length > 0 ? (
              <div className="space-y-3">
                {userRecords.map((record) => (
                  <div
                    key={record.id}
                    className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {billingService.formatApiType(record.api_type)}
                      </span>
                      <div>
                        <div className="font-medium text-gray-900 dark:text-gray-100">
                          {billingService.formatTokenCount(record.total_tokens)} tokens
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-500">
                          {formatDate(record.created_at)} {formatTime(record.created_at)}
                        </div>
                      </div>
                    </div>
                    <div className="text-right text-sm text-gray-500 dark:text-gray-500">
                      <div>输入: {billingService.formatTokenCount(record.input_tokens)}</div>
                      <div>输出: {billingService.formatTokenCount(record.output_tokens)}</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500 dark:text-gray-500">
                暂无使用记录
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default TokenUsageStats;
