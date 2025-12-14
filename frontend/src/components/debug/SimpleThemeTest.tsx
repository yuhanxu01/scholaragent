import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { ThemeToggle } from '../common/ThemeToggle';

export const SimpleThemeTest: React.FC = () => {
  const { theme } = useTheme();

  return (
    <div className="min-h-screen bg-white dark:bg-gray-800 dark:bg-gray-900 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-8">
          React 夜间模式测试
        </h1>

        <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-900 dark:bg-gray-800 rounded-lg">
          <p className="text-gray-600 dark:text-gray-400 dark:text-gray-600 mb-4">
            当前主题: <span className="font-mono bg-gray-100 dark:bg-gray-800 dark:bg-gray-700 px-2 py-1 rounded">
              {theme}
            </span>
          </p>
          
          <div className="mb-4">
            <p className="text-sm text-gray-600 dark:text-gray-400 dark:text-gray-600 mb-2">主题切换按钮:</p>
            <ThemeToggle />
          </div>

          <div className="text-sm text-gray-600 dark:text-gray-400 dark:text-gray-600">
            <p>HTML Classes: <span className="font-mono">{document.documentElement.className}</span></p>
            <p>LocalStorage: <span className="font-mono">{localStorage.getItem('theme') || 'null'}</span></p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700 shadow">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">白色卡片</h3>
            <p className="text-gray-600 dark:text-gray-400 dark:text-gray-600">这是白色背景的测试卡片</p>
          </div>

          <div className="bg-gray-100 dark:bg-gray-800 dark:bg-gray-700 p-4 rounded-lg border border-gray-200 dark:border-gray-700 shadow">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">灰色卡片</h3>
            <p className="text-gray-600 dark:text-gray-400 dark:text-gray-600">这是灰色背景的测试卡片</p>
          </div>

          <div className="bg-blue-100 dark:bg-blue-900/30 p-4 rounded-lg border border-blue-200 dark:border-blue-700 shadow">
            <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-2">蓝色卡片</h3>
            <p className="text-blue-700 dark:text-blue-300">这是蓝色背景的测试卡片</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-4 mb-8">
          <button className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600">
            主要按钮
          </button>
          <button className="bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 px-4 py-2 rounded hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-100">
            次要按钮
          </button>
          <button className="border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 px-4 py-2 rounded hover:bg-gray-50 dark:bg-gray-900 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800">
            轮廓按钮
          </button>
        </div>
      </div>
    </div>
  );
};