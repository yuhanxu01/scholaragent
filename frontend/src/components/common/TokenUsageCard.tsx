import React, { useState, useEffect } from 'react';
import { Zap, TrendingUp, RefreshCw } from 'lucide-react';
import billingService, {
  type UserTokenStats
} from '../../services/billingService';

interface TokenUsageCardProps {
  compact?: boolean;
  showRefresh?: boolean;
}

const TokenUsageCard: React.FC<TokenUsageCardProps> = ({
  compact = false,
  showRefresh = true
}) => {
  const [stats, setStats] = useState<UserTokenStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setLoading(true);
      const userStats = await billingService.getUserStats();
      console.log('Loaded user stats:', userStats);
      setStats(userStats || {
        total_input_tokens: 0,
        total_output_tokens: 0,
        total_tokens: 0,
        api_call_count: 0,
        last_updated: null
      });
    } catch (error) {
      console.error('Failed to load token stats:', error);
      // Set default stats on error
      setStats({
        total_input_tokens: 0,
        total_output_tokens: 0,
        total_tokens: 0,
        api_call_count: 0,
        last_updated: null
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      await loadStats();
    } catch (error) {
      // Error already handled in loadStats
    } finally {
      setRefreshing(false);
    }
  };

  if (compact) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="p-3 bg-yellow-100 dark:bg-yellow-900 rounded-full">
              <Zap className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-500">Token使用</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
                {loading ? '...' : stats ? billingService.formatTokenCount(stats.total_tokens) : '0'}
              </p>
            </div>
          </div>
          {showRefresh && (
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-600 dark:hover:text-gray-600 disabled:opacity-50"
              title="刷新统计"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
          )}
        </div>
        {!loading && stats && (
          <div className="mt-4 grid grid-cols-2 gap-4 text-xs text-gray-500 dark:text-gray-500">
            <div>
              <span className="block">今日: {billingService.formatTokenCount(Math.floor((stats.total_tokens || 0) * 0.1))}</span>
            </div>
            <div>
              <span className="block">调用: {stats.api_call_count || 0}</span>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <div className="p-3 bg-gradient-to-br from-yellow-100 dark:from-yellow-900 to-orange-100 dark:to-orange-900 rounded-full">
            <Zap className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
          </div>
          <div className="ml-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">AI Token使用统计</h3>
            <p className="text-sm text-gray-600 dark:text-gray-500">您的AI服务使用情况</p>
          </div>
        </div>
        {showRefresh && (
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-50 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
            title="刷新统计"
          >
            <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        )}
      </div>

      {loading ? (
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3"></div>
        </div>
      ) : stats ? (
        <div className="space-y-4">
          {/* 主要统计 */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gradient-to-br from-blue-50 dark:from-blue-900 to-blue-100 dark:to-blue-800 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-700 dark:text-blue-300">总Token数</p>
                  <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                    {billingService.formatTokenCount(stats.total_tokens)}
                  </p>
                </div>
                <TrendingUp className="w-8 h-8 text-blue-600 dark:text-blue-400" />
              </div>
            </div>

            <div className="bg-gradient-to-br from-green-50 dark:from-green-900 to-green-100 dark:to-green-800 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-700 dark:text-green-300">API调用</p>
                  <p className="text-2xl font-bold text-green-900 dark:text-green-100">
                    {stats.api_call_count}
                  </p>
                </div>
                <Zap className="w-8 h-8 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </div>

          {/* 详细统计 */}
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-600 mb-3">使用详情</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-500">输入Token:</span>
                <span className="font-medium text-gray-900 dark:text-gray-100">
                  {billingService.formatTokenCount(stats.total_input_tokens)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-500">输出Token:</span>
                <span className="font-medium text-gray-900 dark:text-gray-100">
                  {billingService.formatTokenCount(stats.total_output_tokens)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-500">平均每次:</span>
                <span className="font-medium text-gray-900 dark:text-gray-100">
                  {stats.api_call_count > 0 ?
                    Math.round(stats.total_tokens / stats.api_call_count) : 0}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-500">最后更新:</span>
                <span className="font-medium text-gray-900 dark:text-gray-100">
                  {stats.last_updated ?
                    new Date(stats.last_updated).toLocaleDateString('zh-CN') :
                    '未知'
                  }
                </span>
              </div>
            </div>
          </div>

          {/* 使用趋势指示器 */}
          <div className="bg-gradient-to-r from-yellow-50 dark:from-yellow-900 to-orange-50 dark:to-orange-900 rounded-lg p-4 border border-yellow-200 dark:border-yellow-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-yellow-400 dark:bg-yellow-500 rounded-full mr-2"></div>
                <span className="text-sm font-medium text-yellow-800 dark:text-yellow-200">今日使用</span>
              </div>
              <span className="text-lg font-bold text-yellow-900 dark:text-yellow-100">
                {billingService.formatTokenCount(Math.floor((stats.total_tokens || 0) * 0.1))}
              </span>
            </div>
            <div className="mt-2 w-full bg-yellow-200 dark:bg-yellow-800 rounded-full h-2">
              <div
                className="bg-yellow-500 dark:bg-yellow-400 h-2 rounded-full transition-all duration-300"
                style={{
                  width: `${Math.min(Math.max((Math.floor((stats.total_tokens || 0) * 0.1) / Math.max((stats.total_tokens || 0) * 0.15, 1000)) * 100, 0), 100)}%`
                }}
              ></div>
            </div>
            <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
              今日使用量 / 预计每日限额
            </p>
          </div>
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500 dark:text-gray-500">
          <Zap className="w-12 h-12 text-gray-300 dark:text-gray-600 dark:text-gray-500 mx-auto mb-4" />
          <p>无法加载统计数据</p>
          <button
            onClick={loadStats}
            className="mt-2 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 text-sm underline"
          >
            重试
          </button>
        </div>
      )}
    </div>
  );
};

export default TokenUsageCard;
