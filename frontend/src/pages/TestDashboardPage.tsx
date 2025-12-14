import React from 'react';

export const TestDashboardPage: React.FC = () => {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
        Test Dashboard Page
      </h1>
      <p className="text-gray-600 dark:text-gray-500">
        If you can see this page, the routing is working correctly!
      </p>
    </div>
  );
};