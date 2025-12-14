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
  const [theme, setThemeState] = useState<Theme>('light');
  const [isHydrated, setIsHydrated] = useState(false);

  // 初始化主题
  useEffect(() => {
    // 只在客户端执行
    if (typeof window === 'undefined') return;

    setIsHydrated(true);

    // 从localStorage获取保存的主题设置
    const savedTheme = localStorage.getItem('theme') as Theme | null;

    // 如果有保存的主题，使用保存的主题
    // 否则，使用系统主题偏好
    const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    const initialTheme = savedTheme || systemTheme;

    console.log('ThemeProvider - Initial theme:', initialTheme, '(saved:', savedTheme, 'system:', systemTheme, ')');
    console.log('ThemeProvider - Current HTML classes before applying:', document.documentElement.className);

    // 应用主题
    const root = document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(initialTheme);
    root.style.colorScheme = initialTheme;

    // 更新状态
    setThemeState(initialTheme);

    console.log('ThemeProvider - Applied initial theme to DOM:', initialTheme);
    console.log('ThemeProvider - HTML classes after applying:', root.className);
  }, []); // 只在组件挂载时执行一次

  // 监听主题变化
  useEffect(() => {
    // 在客户端环境下才执行
    if (typeof window === 'undefined' || !isHydrated) return;

    console.log('ThemeProvider - Theme changed to:', theme);

    // 保存到localStorage
    localStorage.setItem('theme', theme);

    // 更新HTML元素的class
    const root = document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(theme);
    root.style.colorScheme = theme;

    console.log('ThemeProvider - HTML classes after update:', root.className);
    console.log('ThemeProvider - localStorage theme:', localStorage.getItem('theme'));
  }, [theme, isHydrated]);

  // 监听系统主题变化
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      // 检查是否有用户手动设置的主题
      const hasUserTheme = localStorage.getItem('theme');
      if (!hasUserTheme) {
        // 没有用户手动设置时，跟随系统主题
        const newTheme = e.matches ? 'dark' : 'light';
        setThemeState(newTheme);
        console.log('ThemeProvider - Following system theme change:', newTheme);
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  const toggleTheme = () => {
    if (!isHydrated) return;
    setThemeState(prevTheme => prevTheme === 'light' ? 'dark' : 'light');
  };

  const setTheme = (newTheme: Theme) => {
    if (!isHydrated) return;
    console.log('ThemeProvider - Manual theme set to:', newTheme);
    setThemeState(newTheme);
  };

  // 在 hydration 完成前，使用一个简单的占位符，避免不匹配
  if (!isHydrated) {
    return (
      <ThemeContext.Provider value={{ theme, toggleTheme, setTheme, isHydrated }}>
        {children}
      </ThemeContext.Provider>
    );
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme, isHydrated }}>
      {children}
    </ThemeContext.Provider>
  );
};