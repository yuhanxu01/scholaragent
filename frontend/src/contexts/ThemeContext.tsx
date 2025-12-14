import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

export type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
  isHydrated: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [isHydrated, setIsHydrated] = useState(false);

  // 只需要在客户端设置 isHydrated
  useEffect(() => {
    setIsHydrated(true);
  }, []);

  // 从 DOM 获取当前主题（由 init-theme.ts 设置）
  const getCurrentTheme = (): Theme => {
    if (typeof window === 'undefined') return 'light';
    return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
  };

  const theme = getCurrentTheme();

  const toggleTheme = () => {
    if (!isHydrated) return;
    const newTheme = theme === 'light' ? 'dark' : 'light';

    // 使用 init-theme.ts 提供的全局函数
    if ((window as any).setTheme) {
      (window as any).setTheme(newTheme);
    } else {
      // 备用方案
      localStorage.setItem('theme', newTheme);
      document.documentElement.classList.remove('light', 'dark');
      document.documentElement.classList.add(newTheme);
      document.documentElement.style.colorScheme = newTheme;
      document.body.classList.remove('light', 'dark');
      document.body.classList.add(newTheme);
    }
  };

  const setTheme = (newTheme: Theme) => {
    if (!isHydrated) return;

    // 使用 init-theme.ts 提供的全局函数
    if ((window as any).setTheme) {
      (window as any).setTheme(newTheme);
    } else {
      // 备用方案
      localStorage.setItem('theme', newTheme);
      document.documentElement.classList.remove('light', 'dark');
      document.documentElement.classList.add(newTheme);
      document.documentElement.style.colorScheme = newTheme;
      document.body.classList.remove('light', 'dark');
      document.body.classList.add(newTheme);
    }
  };

  // 监听主题变化事件（由 init-theme.ts 触发）
  const [currentTheme, setCurrentTheme] = useState(theme);

  useEffect(() => {
    if (!isHydrated) return;

    const handleThemeChange = (e: CustomEvent) => {
      setCurrentTheme(e.detail.theme);
    };

    window.addEventListener('themechange', handleThemeChange as EventListener);
    return () => window.removeEventListener('themechange', handleThemeChange as EventListener);
  }, [isHydrated]);

  return (
    <ThemeContext.Provider value={{ theme: currentTheme, toggleTheme, setTheme, isHydrated }}>
      {children}
    </ThemeContext.Provider>
  );
};