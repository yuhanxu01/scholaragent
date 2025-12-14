import React, { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { ThemeToggle } from '../components/common/ThemeToggle';

export const ThemeDebugPage: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const [htmlClasses, setHtmlClasses] = useState('N/A');
  const [localStorageTheme, setLocalStorageTheme] = useState('N/A');
  const [systemPreference, setSystemPreference] = useState('N/A');

  useEffect(() => {
    if (typeof document !== 'undefined') {
      setHtmlClasses(document.documentElement.className);
    }
    if (typeof localStorage !== 'undefined') {
      setLocalStorageTheme(localStorage.getItem('theme') || 'null');
    }
    if (typeof window !== 'undefined') {
      setSystemPreference(window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    }
  }, [theme]);

  const handleManualToggle = () => {
    console.log('Manual toggle clicked');
    const html = document.documentElement;
    const currentTheme = html.classList.contains('dark') ? 'dark' : 'light';
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';

    html.classList.remove('light', 'dark');
    html.classList.add(newTheme);
    localStorage.setItem('theme', newTheme);

    console.log('Manual theme toggle - new theme:', newTheme);
    console.log('HTML classes after manual toggle:', html.className);
  };

  return (
    <div className="min-h-screen bg-white dark:bg-gray-800 dark:bg-gray-900 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-8">
          主题系统调试页面
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* 主题信息 */}
          <div className="bg-gray-50 dark:bg-gray-900 dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
              当前主题信息
            </h2>
            <div className="space-y-2 font-mono text-sm">
              <p>React Context Theme: <span className="text-blue-600 dark:text-blue-400">{theme}</span></p>
              <p>HTML Classes: <span className="text-green-600 dark:text-green-400">{htmlClasses}</span></p>
              <p>LocalStorage: <span className="text-purple-600 dark:text-purple-400">{localStorageTheme}</span></p>
              <p>System Preference: <span className="text-orange-600 dark:text-orange-400">
                {systemPreference}
              </span></p>
            </div>
          </div>

          {/* 主题切换按钮 */}
          <div className="bg-gray-50 dark:bg-gray-900 dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
              主题切换测试
            </h2>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 dark:text-gray-600 mb-2">React Context 切换:</p>
                <ThemeToggle />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 dark:text-gray-600 mb-2">手动 DOM 切换:</p>
                <button
                  onClick={handleManualToggle}
                  className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
                >
                  手动切换主题
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* 测试卡片 */}
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

        {/* 操作按钮 */}
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

        {/* 调试信息 */}
        <div className="bg-yellow-50 dark:bg-yellow-900/20 p-6 rounded-lg border border-yellow-200 dark:border-yellow-800">
          <h2 className="text-xl font-semibold text-yellow-900 dark:text-yellow-100 mb-4">
            调试说明
          </h2>
          <div className="text-sm text-yellow-800 dark:text-yellow-200 space-y-2">
            <p>• 如果主题切换不工作，请检查浏览器控制台的错误信息</p>
            <p>• 确保 Tailwind CSS 的 dark mode 配置正确</p>
            <p>• 手动切换按钮会直接操作 DOM 并刷新页面</p>
            <p>• React Context 切换应该无刷新切换主题</p>
          </div>
        </div>
      </div>
    </div>
  );
};