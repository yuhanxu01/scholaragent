import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { DashboardPageLight } from '../../pages/light/DashboardPageLight';
import { DashboardPageDark } from '../../pages/dark/DashboardPageDark';

interface ThemePageWrapperProps {
  component: 'dashboard' | 'documents' | 'notes' | 'knowledge' | 'settings';
}

// 组件映射 - Light版本
const LightComponents = {
  dashboard: DashboardPageLight,
  documents: () => <div className="p-8">Documents Light Page (Coming Soon)</div>,
  notes: () => <div className="p-8">Notes Light Page (Coming Soon)</div>,
  knowledge: () => <div className="p-8">Knowledge Light Page (Coming Soon)</div>,
  settings: () => <div className="p-8">Settings Light Page (Coming Soon)</div>,
};

// 组件映射 - Dark版本
const DarkComponents = {
  dashboard: DashboardPageDark,
  documents: () => <div className="p-8">Documents Dark Page (Coming Soon)</div>,
  notes: () => <div className="p-8">Notes Dark Page (Coming Soon)</div>,
  knowledge: () => <div className="p-8">Knowledge Dark Page (Coming Soon)</div>,
  settings: () => <div className="p-8">Settings Dark Page (Coming Soon)</div>,
};

export const ThemePageWrapper: React.FC<ThemePageWrapperProps> = ({ component }) => {
  const { theme } = useTheme();

  // 根据主题选择对应的组件
  const LightComponent = LightComponents[component];
  const DarkComponent = DarkComponents[component];
  const SelectedComponent = theme === 'dark' ? DarkComponent : LightComponent;

  // 只返回选中的组件，布局由 LayoutWrapper 提供
  return <SelectedComponent />;
};