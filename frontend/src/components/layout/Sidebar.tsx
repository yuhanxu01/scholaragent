import React, { useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../contexts/ThemeContext';
import {
  Home,
  FileText,
  BookOpen,
  Book,
  Brain,
  GraduationCap,
  Settings,
  StickyNote,
  MessageCircle,
} from 'lucide-react';

interface SidebarProps {
   open: boolean;
   collapsed: boolean;
   onClose: () => void;
}

interface NavItem {
  name: string;
  href: string;
  icon: React.ReactNode;
  current?: boolean;
  children?: NavItem[];
}

export const Sidebar: React.FC<SidebarProps> = ({ open, collapsed, onClose }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { theme } = useTheme();

  // 根据主题动态设置样式类
  const bgColor = theme === 'dark' ? 'bg-gray-800' : 'bg-white';
  const borderColor = theme === 'dark' ? 'border-gray-700' : 'border-gray-200';
  const textColor = theme === 'dark' ? 'text-gray-100' : 'text-gray-900';
  const subTextColor = theme === 'dark' ? 'text-gray-400' : 'text-gray-600';
  const hoverBg = theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-100';
  const activeBg = theme === 'dark' ? 'bg-gray-900' : 'bg-gray-100';
  const activeTextColor = theme === 'dark' ? 'text-white' : 'text-gray-900';

  // 防止侧边栏打开时背景滚动（仅在移动端）
  useEffect(() => {
    const handleResize = () => {
      // 仅在小屏幕且侧边栏打开时锁定滚动
      if (open && window.innerWidth < 1024) {
        document.body.style.overflow = 'hidden';
      } else {
        document.body.style.overflow = 'unset';
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    // 清理函数
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('resize', handleResize);
    };
  }, [open]);

  const navigation: NavItem[] = [
    {
      name: t('navigation.dashboard'),
      href: '/dashboard',
      icon: <Home className="h-5 w-5" />,
      current: location.pathname === '/dashboard',
    },
    {
      name: t('navigation.documents'),
      href: '/documents',
      icon: <FileText className="h-5 w-5" />,
      current: location.pathname.startsWith('/documents'),
    },
    {
      name: t('navigation.notes') || '笔记',
      href: '/notes',
      icon: <StickyNote className="h-5 w-5" />,
      current: location.pathname.startsWith('/notes'),
    },
    {
      name: '聊天',
      href: '/chat',
      icon: <MessageCircle className="h-5 w-5" />,
      current: location.pathname.startsWith('/chat'),
    },
    {
      name: t('navigation.reader'),
      href: '/reader',
      icon: <BookOpen className="h-5 w-5" />,
      current: location.pathname.startsWith('/reader'),
    },
    {
      name: '生词本',
      href: '/vocabulary',
      icon: <Book className="h-5 w-5" />,
      current: location.pathname === '/vocabulary',
    },
    {
      name: t('navigation.knowledgeBase'),
      href: '/knowledge',
      icon: <Brain className="h-5 w-5" />,
      current: location.pathname.startsWith('/knowledge'),
    },
    {
      name: t('navigation.studyProgress'),
      href: '/study',
      icon: <GraduationCap className="h-5 w-5" />,
      current: location.pathname.startsWith('/study'),
    },
    {
      name: t('navigation.settings'),
      href: '/settings',
      icon: <Settings className="h-5 w-5" />,
      current: location.pathname.startsWith('/settings'),
    },
  ];

  return (
    <>
      {/* Mobile sidebar overlay */}
      {open && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black bg-opacity-50 transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-50 ${bgColor} shadow-xl border-r ${borderColor}
        transform transition-all duration-300 ease-in-out
        ${open ? 'translate-x-0' : '-translate-x-full'}
        ${collapsed ? 'lg:w-16' : 'lg:w-64 lg:translate-x-0'}
      `}>
        <div className="flex flex-col h-full">
          {/* Sidebar header - visible on mobile only */}
          <div className={`lg:hidden flex items-center justify-between p-4 border-b ${borderColor}`}>
            <h2 className={`text-lg font-semibold ${textColor}`}>{t('navigation.menu')}</h2>
            <button
              onClick={onClose}
              className={`p-2 rounded-md ${subTextColor} hover:text-gray-500 ${hoverBg}`}
            >
              ×
            </button>
          </div>

          {/* Navigation */}
          <nav className={`flex-1 py-6 space-y-1 ${collapsed ? 'px-2' : 'px-4'}`}>
            {navigation.map((item) => {
              const isActive = item.current;

              return (
                <Link
                  key={item.name}
                  to={item.href}
                  onClick={() => onClose()}
                  className={`
                    group flex items-center ${collapsed ? 'px-3 py-3 justify-center' : 'px-3 py-2'} text-sm font-medium rounded-lg transition-colors
                    ${isActive
                      ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border-r-2 border-blue-700 dark:border-blue-400'
                      : `${textColor} ${hoverBg}`
                    }
                  `}
                  title={collapsed ? item.name : undefined}
                >
                  <span className={`
                    flex-shrink-0 ${collapsed ? '' : 'mr-3'} h-5 w-5
                    ${isActive ? 'text-blue-700 dark:text-blue-400' : `${subTextColor} group-hover:text-gray-500`}
                  `}>
                    {item.icon}
                  </span>
                  {!collapsed && <span className="flex-1">{item.name}</span>}
                </Link>
              );
            })}
          </nav>

          {/* Sidebar footer */}
          <div className={`${collapsed ? 'p-2' : 'p-4'} border-t ${borderColor}`}>
            {!collapsed && (
              <>
                <div className={`text-xs ${subTextColor} mb-2`}>{t('sidebar.scholarMind')}</div>
                <div className={`text-xs ${subTextColor}`}>{t('sidebar.academicAIAssistant')}</div>
              </>
            )}
            <div className="mt-2 flex justify-center">
              <button
                onClick={() => {
                  navigate('/help');
                  onClose();
                }}
                className={`text-xs text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300 ${collapsed ? 'p-2' : ''}`}
                title={collapsed ? t('navigation.helpDocumentation') : undefined}
              >
                {collapsed ? '?' : t('navigation.helpDocumentation')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};