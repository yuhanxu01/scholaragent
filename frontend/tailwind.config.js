/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // 使用 CSS 变量定义颜色
        primary: {
          DEFAULT: 'rgb(var(--text-primary))',
        },
        secondary: {
          DEFAULT: 'rgb(var(--text-secondary))',
        },
        background: {
          primary: 'rgb(var(--bg-primary))',
          secondary: 'rgb(var(--bg-secondary))',
          tertiary: 'rgb(var(--bg-tertiary))',
        },
        border: {
          primary: 'rgb(var(--border-primary))',
          secondary: 'rgb(var(--border-secondary))',
        },
        accent: {
          DEFAULT: 'rgb(var(--accent))',
          hover: 'rgb(var(--accent-hover))',
          light: 'rgb(var(--accent-light))',
        },
      },
    },
  },
  plugins: [],
}