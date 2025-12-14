import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Header } from './Header';
import { Sidebar } from './Sidebar';

interface MainLayoutProps {
  children?: React.ReactNode;
}

export const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
   const [sidebarOpen, setSidebarOpen] = useState(false);
   const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

   return (
     <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex">
       <Sidebar
         open={sidebarOpen}
         collapsed={sidebarCollapsed}
         onClose={() => setSidebarOpen(false)}
       />

       {/* 主内容区域 */}
       <div className="flex flex-col flex-1 min-h-screen transition-all duration-300">
         <Header
           sidebarOpen={sidebarOpen}
           sidebarCollapsed={sidebarCollapsed}
           setSidebarOpen={setSidebarOpen}
           setSidebarCollapsed={setSidebarCollapsed}
         />

         <main className="flex-1">
           {/* 主内容 */}
           <div className="px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
             {children || <Outlet />}
           </div>
         </main>
       </div>
     </div>
   );
};