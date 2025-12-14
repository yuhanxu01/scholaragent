import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { Moon, Sun } from 'lucide-react';

export const ThemeTestButton: React.FC = () => {
  const { theme, toggleTheme } = useTheme();

  console.log('🔄 ThemeTestButton - Current theme:', theme);
  console.log('🔄 ThemeTestButton - HTML classes:', document.documentElement.className);
  console.log('🔄 ThemeTestButton - localStorage theme:', localStorage.getItem('theme'));

  const handleToggle = () => {
    console.log('🖱️ ThemeTestButton - Button clicked!');
    console.log('🖱️ ThemeTestButton - Current theme before:', theme);
    toggleTheme();
    console.log('🖱️ ThemeTestButton - toggleTheme called');
  };

  return (
    <div className="fixed bottom-4 left-4 z-50 bg-red-500 text-white p-4 rounded-lg shadow-lg">
      <div className="mb-2">
        <strong>调试信息:</strong>
      </div>
      <div className="text-sm mb-2">
        当前主题: <span className="font-mono">{theme}</span>
      </div>
      <div className="text-sm mb-2">
        HTML类: <span className="font-mono">{document.documentElement.className}</span>
      </div>
      <div className="text-sm mb-4">
        localStorage: <span className="font-mono">{localStorage.getItem('theme')}</span>
      </div>
      
      <button
        onClick={handleToggle}
        className="bg-white text-red-500 px-4 py-2 rounded font-semibold hover:bg-gray-100 transition-colors"
      >
        {theme === 'light' ? (
          <div className="flex items-center gap-2">
            <Moon className="w-4 h-4" />
            切换到夜间
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Sun className="w-4 h-4" />
            切换到日间
          </div>
        )}
      </button>
      
      <div className="mt-2 text-xs">
        点击测试主题切换功能
      </div>
    </div>
  );
};
