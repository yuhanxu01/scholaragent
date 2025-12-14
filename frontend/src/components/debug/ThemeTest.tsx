import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { ThemeToggle } from '../common/ThemeToggle';

export const ThemeTest: React.FC = () => {
  const { theme } = useTheme();

  return (
    <div className="p-8 bg-white dark:bg-gray-800 min-h-screen">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
        主题测试页面
      </h1>

      <div className="mb-6">
        <p className="text-gray-600 dark:text-gray-600 mb-4">
          当前主题: <span className="font-mono bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
            {theme}
          </span>
        </p>

        <div className="flex items-center gap-4 mb-4">
          <ThemeToggle />
          <span className="text-sm text-gray-500 dark:text-gray-500">
            点击按钮切换主题
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
            测试卡片 1
          </h2>
          <p className="text-gray-600 dark:text-gray-600">
            这是一个测试卡片，用于验证夜间模式是否正常工作。
          </p>
        </div>

        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
          <h2 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-2">
            测试卡片 2
          </h2>
          <p className="text-blue-700 dark:text-blue-300">
            这是一个蓝色主题的测试卡片。
          </p>
        </div>
      </div>

      <div className="mt-6">
        <button className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600">
          测试按钮
        </button>
      </div>

      <div className="mt-6 p-4 bg-gray-100 dark:bg-gray-800 rounded">
        <h3 className="font-mono text-sm mb-2">调试信息:</h3>
        <pre className="text-xs text-gray-600 dark:text-gray-500">
          {JSON.stringify({
            theme,
            htmlClass: document.documentElement.className,
            localStorage: localStorage.getItem('theme')
          }, null, 2)}
        </pre>
      </div>
    </div>
  );
};