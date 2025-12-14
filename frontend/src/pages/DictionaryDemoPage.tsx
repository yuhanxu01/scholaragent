import React, { useState } from 'react';
import { DictionaryDemo } from '../components/dictionary/DictionaryDemo';

export function DictionaryDemoPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto py-6">
        <div className="mb-6 text-center">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            词典功能演示
          </h1>
          <p className="text-gray-600 dark:text-gray-500">
            体验智能查词和生词管理功能
          </p>
          <div className="mt-4 text-sm text-gray-500 dark:text-gray-500">
            <strong>访问路径：</strong>
            <ul className="mt-2 space-y-1">
              <li>• 普通阅读器: <code className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">/reader/:id</code></li>
              <li>• 增强阅读器: <code className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">/enhanced-reader/:id</code></li>
              <li>• 生词本: <code className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">/vocabulary</code></li>
            </ul>
          </div>
        </div>

        <DictionaryDemo />
      </div>
    </div>
  );
}