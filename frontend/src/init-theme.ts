// 主题初始化脚本 - 确保主题在应用启动前正确设置
(function() {
  console.log('🎨 初始化主题系统...');

  // 1. 确保在客户端执行
  if (typeof window === 'undefined') {
    console.log('⚠️ 服务器端渲染，跳过主题初始化');
    return;
  }

  // 2. 立即设置主题，避免闪烁
  const savedTheme = localStorage.getItem('theme');
  const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const theme = savedTheme || (systemPrefersDark ? 'dark' : 'light');

  console.log('📊 主题信息:', {
    saved: savedTheme,
    system: systemPrefersDark ? 'dark' : 'light',
    applied: theme
  });

  // 3. 设置 HTML 元素的类和样式
  const html = document.documentElement;
  const body = document.body;

  // 移除可能存在的旧类
  html.classList.remove('light', 'dark');
  body.classList.remove('light', 'dark');

  // 添加新类
  html.classList.add(theme);
  html.style.colorScheme = theme;

  body.classList.add(theme);

  console.log('✅ HTML 类已设置:', html.className);
  console.log('✅ color-scheme 已设置:', html.style.colorScheme);

  // 4. 监听系统主题变化（仅在用户没有手动设置时）
  if (!savedTheme) {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQuery.addEventListener('change', (e) => {
      const newTheme = e.matches ? 'dark' : 'light';
      console.log('🌓 系统主题变化:', newTheme);

      html.classList.remove('light', 'dark');
      body.classList.remove('light', 'dark');
      html.classList.add(newTheme);
      body.classList.add(newTheme);
      html.style.colorScheme = newTheme;
    });
  }

  // 5. 创建全局主题切换函数
  (window as any).setTheme = function(newTheme: 'light' | 'dark') {
    console.log('🔄 手动切换主题到:', newTheme);
    localStorage.setItem('theme', newTheme);

    html.classList.remove('light', 'dark');
    body.classList.remove('light', 'dark');
    html.classList.add(newTheme);
    body.classList.add(newTheme);
    html.style.colorScheme = newTheme;

    // 触发主题变化事件
    window.dispatchEvent(new CustomEvent('themechange', { detail: { theme: newTheme } }));
  };

  // 6. 添加 CSS 变量覆盖，确保样式正确应用
  const style = document.createElement('style');
  style.textContent = `
    /* 强制确保主题样式正确应用 */
    html {
      color-scheme: ${theme};
    }

    /* 确保基础背景色 */
    body {
      background-color: ${theme === 'dark' ? 'rgb(17, 24, 39)' : 'rgb(249, 250, 51)'};
    }

    /* 确保 dark 类生效 */
    html.dark .dark\\:bg-gray-800 {
      background-color: rgb(31, 41, 55) !important;
    }

    html.light .bg-white {
      background-color: rgb(255, 255, 255) !important;
    }

    /* 确保文字颜色 */
    html.dark .dark\\:text-gray-100 {
      color: rgb(243, 244, 246) !important;
    }

    html.light .text-gray-900 {
      color: rgb(17, 24, 39) !important;
    }

    /* 确保边框颜色 */
    html.dark .dark\\:border-gray-700 {
      border-color: rgb(55, 65, 81) !important;
    }

    html.light .border-gray-200 {
      border-color: rgb(229, 231, 235) !important;
    }
  `;
  document.head.appendChild(style);

  console.log('🎯 主题初始化完成！');
})();