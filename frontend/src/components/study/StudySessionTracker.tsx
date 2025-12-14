import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';

interface StudySession {
  id: string;
  start_time: string;
  end_time?: string;
  duration?: number;
  session_type: string;
}

interface StudySessionTrackerProps {
  onSessionUpdate?: (hours: number) => void;
}

export const StudySessionTracker: React.FC<StudySessionTrackerProps> = ({
  onSessionUpdate
}) => {
  const [currentSession, setCurrentSession] = useState<StudySession | null>(null);
  const [studyStats, setStudyStats] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // 开始学习会话
  const startSession = async (sessionType: string = 'review') => {
    try {
      setLoading(true);
      const response = await api.startStudySession(sessionType);
      setCurrentSession(response.data);
      console.log('学习会话开始:', response.data);
    } catch (error) {
      console.error('开始学习会话失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 结束学习会话
  const endSession = async (cardsStudied: number = 0, correctAnswers: number = 0) => {
    if (!currentSession) return;

    try {
      setLoading(true);
      const response = await api.endStudySession(currentSession.id, {
        cards_studied: cardsStudied,
        correct_answers: correctAnswers
      });
      
      console.log('学习会话结束:', response.data);
      setCurrentSession(null);
      
      // 刷新统计数据
      await fetchStudyStats();
    } catch (error) {
      console.error('结束学习会话失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 获取学习统计
  const fetchStudyStats = async () => {
    try {
      const response = await api.getStudyStatistics(30); // 最近30天
      setStudyStats(response.data);
      
      // 通知父组件更新总学习时间
      if (onSessionUpdate && response.data.total_time_hours !== undefined) {
        onSessionUpdate(response.data.total_time_hours);
      }
    } catch (error) {
      console.error('获取学习统计失败:', error);
    }
  };

  // 获取用户学习时间统计
  const fetchUserStats = async () => {
    try {
      const response = await api.getUserStats();
      console.log('用户统计:', response.data);
      
      if (onSessionUpdate && response.data.study_time_hours !== undefined) {
        onSessionUpdate(response.data.study_time_hours);
      }
    } catch (error) {
      console.error('获取用户统计失败:', error);
    }
  };

  useEffect(() => {
    fetchUserStats();
    fetchStudyStats();
  }, []);

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}时${minutes}分${secs}秒`;
    } else if (minutes > 0) {
      return `${minutes}分${secs}秒`;
    } else {
      return `${secs}秒`;
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 max-w-md">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
        学习时间追踪
      </h3>

      {/* 当前会话状态 */}
      <div className="mb-4">
        {currentSession ? (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600">正在学习</p>
                <p className="text-xs text-blue-500">
                  类型: {currentSession.session_type}
                </p>
              </div>
              <button
                onClick={() => endSession()}
                disabled={loading}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
              >
                结束学习
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
            <p className="text-sm text-gray-600 dark:text-gray-500 mb-3">暂无进行中的学习会话</p>
            <div className="flex space-x-2">
              <button
                onClick={() => startSession('review')}
                disabled={loading}
                className="px-3 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                开始复习
              </button>
              <button
                onClick={() => startSession('reading')}
                disabled={loading}
                className="px-3 py-1 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 disabled:opacity-50"
              >
                开始阅读
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 学习统计 */}
      {studyStats && (
        <div className="space-y-3">
          <h4 className="text-md font-medium text-gray-800 dark:text-gray-200">学习统计（最近30天）</h4>
          
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-50 dark:bg-gray-900 p-3 rounded">
              <p className="text-xs text-gray-600 dark:text-gray-500">总学习时间</p>
              <p className="text-lg font-semibold">
                {studyStats.total_time_hours?.toFixed(1) || 0}h
              </p>
            </div>
            
            <div className="bg-gray-50 dark:bg-gray-900 p-3 rounded">
              <p className="text-xs text-gray-600 dark:text-gray-500">学习会话</p>
              <p className="text-lg font-semibold">
                {studyStats.total_sessions || 0}次
              </p>
            </div>
            
            <div className="bg-gray-50 dark:bg-gray-900 p-3 rounded">
              <p className="text-xs text-gray-600 dark:text-gray-500">学习卡片</p>
              <p className="text-lg font-semibold">
                {studyStats.total_cards_studied || 0}张
              </p>
            </div>
            
            <div className="bg-gray-50 dark:bg-gray-900 p-3 rounded">
              <p className="text-xs text-gray-600 dark:text-gray-500">平均准确率</p>
              <p className="text-lg font-semibold">
                {studyStats.average_accuracy?.toFixed(1) || 0}%
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 快速操作 */}
      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
        <button
          onClick={fetchUserStats}
          className="w-full px-3 py-2 text-sm bg-gray-200 text-white rounded-md hover:bg-gray-100"
        >
          刷新学习统计
        </button>
      </div>
    </div>
  );
};