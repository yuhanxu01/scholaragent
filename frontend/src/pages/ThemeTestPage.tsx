import React, { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';

export const ThemeTestPage: React.FC = () => {
  const { theme, toggleTheme, setTheme, isHydrated } = useTheme();
  const [currentTheme, setCurrentTheme] = useState<string>('');
  const [htmlClasses, setHtmlClasses] = useState<string>('');
  const [localStorageTheme, setLocalStorageTheme] = useState<string>('');

  useEffect(() => {
    // 更新状态
    setCurrentTheme(theme);
    setHtmlClasses(document.documentElement.className);
    setLocalStorageTheme(localStorage.getItem('theme') || 'not set');

    // 监听变化
    const interval = setInterval(() => {
      setHtmlClasses(document.documentElement.className);
      setLocalStorageTheme(localStorage.getItem('theme') || 'not set');
    }, 100);

    return () => clearInterval(interval);
  }, [theme]);

  if (!isHydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-8">
          主题测试页面
        </h1>

        {/* 主题状态信息 */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
            主题状态信息
          </h2>
          <div className="space-y-2 font-mono text-sm">
            <p>当前主题 (Context): <span className="text-blue-600">{currentTheme}</span></p>
            <p>HTML 类: <span className="text-blue-600">{htmlClasses || '(空的)'}</span></p>
            <p>localStorage: <span className="text-blue-600">{localStorageTheme}</span></p>
            <p>系统偏好: <span className="text-blue-600">{window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'}</span></p>
            <p>color-scheme: <span className="text-blue-600">{getComputedStyle(document.documentElement).colorScheme}</span></p>
          </div>
        </div>

        {/* 测试卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
              白色卡片测试
            </h3>
            <p className="text-gray-600 dark:text-gray-300">
              这应该是白色背景，深色文字。
            </p>
          </div>

          <div className="bg-gray-100 dark:bg-gray-700 rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
              灰色卡片测试
            </h3>
            <p className="text-gray-600 dark:text-gray-300">
              这应该是浅色背景（日间）或深色背景（夜间）。
            </p>
          </div>
        </div>

        {/* 主题切换按钮 */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
            主题切换控制
          </h2>
          <div className="space-x-4">
            <button
              onClick={() => setTheme('light')}
              className="px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded hover:bg-gray-50 dark:hover:bg-gray-600"
            >
              强制日间模式
            </button>
            <button
              onClick={() => setTheme('dark')}
              className="px-4 py-2 bg-gray-800 dark:bg-gray-900 border border-gray-600 dark:border-gray-700 text-gray-100 dark:text-gray-200 rounded hover:bg-gray-700 dark:hover:bg-gray-800"
            >
              强制夜间模式
            </button>
            <button
              onClick={toggleTheme}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              切换主题
            </button>
          </div>
        </div>

        {/* 调试命令 */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
            调试命令
          </h2>
          <div className="space-y-2">
            <p className="text-sm text-gray-600 dark:text-gray-300">
              在控制台中运行以下命令来调试：
            </p>
            <pre className="bg-gray-100 dark:bg-gray-700 p-3 rounded text-xs overflow-x-auto">
              {`// 检查主题
document.documentElement.className
localStorage.getItem('theme')

// 手动设置主题
document.documentElement.classList.add('dark');
document.documentElement.classList.remove('light');

// 或者使用全局函数
window.setTheme('dark');
window.setTheme('light');`}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};