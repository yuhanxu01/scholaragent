import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../contexts/ThemeContext';
import { User, LogOut, BookOpen, Menu, X, Settings, HelpCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { LanguageToggle } from '../common/LanguageToggle';
import { ThemeToggle } from '../common/ThemeToggle';

interface HeaderProps {
   sidebarOpen: boolean;
   sidebarCollapsed: boolean;
   setSidebarOpen: (open: boolean) => void;
   setSidebarCollapsed: (collapsed: boolean) => void;
}

export const Header: React.FC<HeaderProps> = ({ sidebarOpen, sidebarCollapsed, setSidebarOpen, setSidebarCollapsed }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { theme } = useTheme();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // 根据主题动态设置样式类
  const bgColor = theme === 'dark' ? 'bg-gray-800' : 'bg-white';
  const borderColor = theme === 'dark' ? 'border-gray-700' : 'border-gray-200';
  const textColor = theme === 'dark' ? 'text-gray-100' : 'text-gray-900';
  const subTextColor = theme === 'dark' ? 'text-gray-400' : 'text-gray-500';
  const buttonColor = theme === 'dark' ? 'text-gray-500 hover:text-gray-400 hover:bg-gray-700' : 'text-gray-400 hover:text-gray-500 hover:bg-gray-100';
  const dropdownBg = theme === 'dark' ? 'bg-gray-800' : 'bg-white';
  const dropdownItemColor = theme === 'dark' ? 'text-gray-200 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-100';
  const dropdownBorderColor = theme === 'dark' ? 'border-gray-700' : 'border-gray-100';

  const handleLogout = async () => {
    await logout();
  };

  const handleNavigate = (path: string) => {
    setIsDropdownOpen(false);
    navigate(path);
  };

  return (
    <header className={`${bgColor} shadow-sm border-b ${borderColor}`}>
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Left side - Logo and hamburger menu */}
          <div className="flex items-center">
            {/* Desktop sidebar toggle */}
            <button
              type="button"
              className={`hidden lg:flex p-2 rounded-md ${buttonColor} focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 mr-2`}
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              title={sidebarCollapsed ? '展开侧边栏' : '折叠侧边栏'}
            >
              {sidebarCollapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
            </button>

            {/* Mobile hamburger menu */}
            <button
              type="button"
              className={`lg:hidden p-2 rounded-md ${buttonColor} focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500`}
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              {sidebarOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>

            <Link to="/dashboard" className="flex items-center space-x-3 ml-2 lg:ml-0">
              <div className="flex-shrink-0">
                <BookOpen className="h-8 w-8 text-blue-600" />
              </div>
              <div className="hidden sm:block">
                <h1 className={`text-xl font-bold ${textColor}`}>ScholarMind</h1>
                <p className={`text-xs ${subTextColor}`}>AI Academic Assistant</p>
              </div>
            </Link>
          </div>

          {/* Right side - User menu */}
          <div className="flex items-center space-x-4">
            {/* Theme toggle */}
            <ThemeToggle size="sm" />

            {/* Language toggle */}
            <LanguageToggle />

            {/* Current page title (mobile only) */}
            <div className="lg:hidden">
              <span className={`text-sm font-medium ${textColor}`}>
                {getPageTitle(location.pathname, t)}
              </span>
            </div>

            {/* User dropdown */}
            <div className="relative flex items-center space-x-3">
              {/* 文本区域 - 点击触发下拉菜单 */}
              <button
                className="hidden sm:block text-right focus:outline-none"
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                onBlur={() => setTimeout(() => setIsDropdownOpen(false), 200)}
              >
                <div className={`text-sm font-medium ${textColor}`}>
                  {user?.firstName} {user?.lastName}
                </div>
                <div className={`text-xs ${subTextColor}`}>{user?.email}</div>
              </button>

              {/* 头像 - 点击触发下拉菜单 */}
              <button
                className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
                title="查看我的主页"
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                onBlur={() => setTimeout(() => setIsDropdownOpen(false), 200)}
              >
                {user?.firstName ? (
                  <span className="text-sm font-medium text-blue-600">
                    {user.firstName.charAt(0).toUpperCase()}
                  </span>
                ) : (
                  <User className="h-5 w-5 text-blue-600" />
                )}
              </button>

              {/* Dropdown menu */}
              {isDropdownOpen && (
                <div className={`absolute right-0 top-full mt-2 w-48 rounded-md shadow-lg ${dropdownBg} ring-1 ring-black dark:ring-gray-700 ring-opacity-5 dark:ring-opacity-50 z-10`}>
                  <div className="py-1">
                    <button
                      onClick={() => handleNavigate(`/user/${user?.id}`)}
                      className={`flex items-center w-full px-4 py-2 text-sm ${dropdownItemColor}`}
                    >
                      <User className="h-4 w-4 mr-2" />
                      我的主页
                    </button>
                    <button
                      onClick={() => handleNavigate('/settings')}
                      className={`flex items-center w-full px-4 py-2 text-sm ${dropdownItemColor}`}
                    >
                      <Settings className="h-4 w-4 mr-2" />
                      {t('common.settings')}
                    </button>
                    <button
                      onClick={() => handleNavigate('/help')}
                      className={`flex items-center w-full px-4 py-2 text-sm ${dropdownItemColor}`}
                    >
                      <HelpCircle className="h-4 w-4 mr-2" />
                      {t('common.help')}
                    </button>
                    <div className={`border-t ${dropdownBorderColor} my-1`}></div>
                    <button
                      onClick={handleLogout}
                      className={`flex items-center w-full px-4 py-2 text-sm ${dropdownItemColor}`}
                    >
                      <LogOut className="h-4 w-4 mr-2" />
                      {t('auth.logout')}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

// Helper function to get page titles
function getPageTitle(pathname: string, t: (key: string) => string): string {
  const routeTitles: Record<string, string> = {
    '/dashboard': t('navigation.dashboard'),
    '/documents': t('navigation.documents'),
    '/reader': t('navigation.reader'),
    '/knowledge': t('navigation.knowledgeBase'),
    '/study': t('navigation.studyProgress'),
    '/settings': t('navigation.settings'),
  };

  for (const [path, title] of Object.entries(routeTitles)) {
    if (pathname.startsWith(path)) {
      return title;
    }
  }

  return 'ScholarMind';
}