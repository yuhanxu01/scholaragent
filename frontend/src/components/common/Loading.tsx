import React from 'react';
import { cn } from '../../utils/cn';
import { Loader2 } from 'lucide-react';

interface LoadingProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  text?: string;
}

export const Loading: React.FC<LoadingProps> = ({
  size = 'md',
  className,
  text,
}) => {
  const sizes = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
  };

  return (
    <div className={cn('flex items-center justify-center', className)}>
      <Loader2 className={cn('animate-spin text-blue-600 dark:text-blue-400', sizes[size])} />
      {text && (
        <span className="ml-2 text-sm text-gray-600 dark:text-gray-500">{text}</span>
      )}
    </div>
  );
};

export const LoadingSpinner: React.FC<{ className?: string }> = ({
  className,
}) => {
  return (
    <div className={cn('flex items-center justify-center min-h-[200px]', className)}>
      <Loader2 className="w-8 h-8 animate-spin text-blue-600 dark:text-blue-400" />
    </div>
  );
};

export const PageLoading: React.FC = () => {
  return (
    <div className="fixed inset-0 bg-white dark:bg-gray-900 dark:bg-opacity-90 bg-opacity-75 flex items-center justify-center z-50">
      <div className="text-center">
        <Loader2 className="w-12 h-12 animate-spin text-blue-600 dark:text-blue-400 mx-auto" />
        <p className="mt-2 text-gray-600 dark:text-gray-500">Loading...</p>
      </div>
    </div>
  );
};