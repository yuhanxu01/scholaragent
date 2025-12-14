import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Toaster } from 'react-hot-toast'
import './index.css'
import App from './App.tsx'

// 确保在 DOM 完全加载后才渲染应用
document.addEventListener('DOMContentLoaded', () => {
  // 在客户端初始化主题
  const savedTheme = localStorage.getItem('theme') || 'light'
  const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  const theme = savedTheme || systemTheme

  // 在应用渲染前就设置好主题
  document.documentElement.classList.remove('light', 'dark')
  document.documentElement.classList.add(theme)
  document.documentElement.style.colorScheme = theme

  console.log('main.tsx - Pre-render theme setup:', theme)
  console.log('main.tsx - HTML classes before render:', document.documentElement.className)
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
    <Toaster
      position="top-right"
      toastOptions={{
        duration: 4000,
        style: {
          background: '#363636',
          color: '#fff',
        },
      }}
    />
  </StrictMode>,
)