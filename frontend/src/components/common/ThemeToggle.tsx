import React from 'react';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { cn } from '../../utils/cn';

interface ThemeToggleProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({
  className = '',
  size = 'md'
}) => {
  const { theme, toggleTheme } = useTheme();

  console.log('ThemeToggle - Current theme:', theme);

  const handleToggle = () => {
    console.log('ThemeToggle - Button clicked, current theme:', theme);
    toggleTheme();
  };

  const sizeClasses = {
    sm: 'p-1.5',
    md: 'p-2',
    lg: 'p-3'
  };

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6'
  };

  return (
    <button
      onClick={handleToggle}
      className={cn(
        'relative rounded-lg transition-all duration-300 hover:scale-105',
        'bg-gray-100 dark:bg-gray-800',
        'text-gray-600 dark:text-amber-400',
        'hover:bg-gray-200 dark:hover:bg-gray-700',
        'border border-gray-200 dark:border-gray-700',
        'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
        'dark:focus:ring-offset-gray-900',
        'shadow-sm dark:shadow-md',
        sizeClasses[size],
        className
      )}
      title={theme === 'light' ? '切换到夜间模式' : '切换到日间模式'}
    >
      <div className="relative">
        {theme === 'light' ? (
          <Moon className={cn(iconSizes[size], 'transition-all duration-300')} />
        ) : (
          <Sun className={cn(iconSizes[size], 'transition-all duration-300')} />
        )}
      </div>
    </button>
  );
};