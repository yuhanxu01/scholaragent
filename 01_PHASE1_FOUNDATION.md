# Phase 1: 基础架构 (Sprint 1-2)

## 阶段目标
建立项目基础架构，包括Django后端项目、React前端项目、用户认证系统和基础数据模型。

---

## Task 1.1: 创建Django后端项目

### 任务描述
初始化Django项目，配置项目结构、数据库、环境变量等基础设施。

### AI Code Agent 提示词

```
请创建一个Django后端项目，要求如下：

## 项目结构
创建以下目录结构：
```
backend/
├── config/
│   ├── __init__.py
│   ├── settings/
│   │   ├── __init__.py
│   │   ├── base.py          # 基础配置
│   │   ├── development.py   # 开发环境
│   │   └── production.py    # 生产环境
│   ├── urls.py
│   ├── wsgi.py
│   └── asgi.py
├── apps/
│   └── __init__.py
├── core/
│   └── __init__.py
├── manage.py
├── requirements/
│   ├── base.txt
│   ├── development.txt
│   └── production.txt
└── .env.example
```

## 配置要求

### base.py 配置
1. SECRET_KEY 从环境变量读取
2. 配置 INSTALLED_APPS，预留以下自定义apps:
   - apps.users
   - apps.documents
   - apps.knowledge
   - apps.agent
   - apps.study
3. 配置中间件，包含CORS中间件
4. 数据库使用PostgreSQL，从环境变量读取配置
5. 配置Redis缓存
6. 配置静态文件和媒体文件路径
7. 配置REST Framework:
   - 默认认证使用JWT
   - 分页默认20条
   - 异常处理自定义
8. 配置Celery
9. 时区设置为Asia/Shanghai
10. 配置日志系统

### requirements/base.txt
```
Django>=5.0
djangorestframework>=3.14
djangorestframework-simplejwt>=5.3
django-cors-headers>=4.3
django-environ>=0.11
psycopg2-binary>=2.9
redis>=5.0
celery>=5.3
channels>=4.0
channels-redis>=4.1
Pillow>=10.0
python-magic>=0.4
sympy>=1.12
httpx>=0.25
markdown>=3.5
python-frontmatter>=1.0
```

### .env.example
```
DEBUG=True
SECRET_KEY=your-secret-key-here
DATABASE_URL=postgres://user:password@localhost:5432/scholarmind
REDIS_URL=redis://localhost:6379/0
DEEPSEEK_API_KEY=your-api-key
DEEPSEEK_BASE_URL=https://api.deepseek.com
ALLOWED_HOSTS=localhost,127.0.0.1
CORS_ALLOWED_ORIGINS=http://localhost:5173
```

## 验收标准
1. 运行 `python manage.py check` 无错误
2. 能够连接数据库（使用SQLite测试）
3. 能够启动开发服务器
```

### 验收检查
```bash
cd backend
python manage.py check
python manage.py runserver
# 访问 http://localhost:8000 应该看到Django欢迎页或404
```

---

## Task 1.2: 创建Users应用

### 任务描述
创建用户系统，包括自定义用户模型、用户画像、JWT认证等。

### AI Code Agent 提示词

```
请在Django项目中创建users应用，实现完整的用户系统：

## 目录结构
```
apps/users/
├── __init__.py
├── admin.py
├── apps.py
├── models.py
├── serializers.py
├── views.py
├── urls.py
├── permissions.py
├── signals.py
└── tests.py
```

## Models定义 (models.py)

### CustomUser模型
继承AbstractUser，添加以下字段：
```python
class CustomUser(AbstractUser):
    email = models.EmailField(unique=True)
    avatar = models.ImageField(upload_to='avatars/', null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username']
```

### UserProfile模型
```python
class UserProfile(models.Model):
    user = models.OneToOneField(CustomUser, on_delete=models.CASCADE, related_name='profile')
    
    # 教育背景
    education_level = models.CharField(max_length=20, choices=[
        ('undergraduate', '本科'),
        ('graduate', '硕士'),
        ('phd', '博士'),
        ('professional', '职业'),
    ], default='undergraduate')
    major = models.CharField(max_length=100, blank=True)
    
    # 自评能力等级 1-5
    math_level = models.IntegerField(default=3, validators=[MinValueValidator(1), MaxValueValidator(5)])
    programming_level = models.IntegerField(default=3, validators=[MinValueValidator(1), MaxValueValidator(5)])
    
    # 学习偏好 (JSON字段)
    preferences = models.JSONField(default=dict, blank=True)
    # 默认值: {
    #   "explanation_style": "intuitive",  # formal/intuitive/example_based
    #   "detail_level": "moderate",         # concise/moderate/detailed
    #   "language": "zh",
    #   "like_analogies": true,
    #   "like_visualizations": true
    # }
    
    # 研究兴趣
    research_interests = models.JSONField(default=list, blank=True)
    
    # 使用统计
    total_documents = models.IntegerField(default=0)
    total_questions = models.IntegerField(default=0)
    total_study_minutes = models.IntegerField(default=0)
    streak_days = models.IntegerField(default=0)
    last_active_date = models.DateField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
```

## Serializers (serializers.py)
1. UserSerializer - 用户基本信息
2. UserProfileSerializer - 用户画像
3. UserRegisterSerializer - 注册
4. UserLoginSerializer - 登录
5. ChangePasswordSerializer - 修改密码

## Views (views.py)
使用DRF的ViewSet和APIView:
1. UserViewSet - 用户CRUD（仅管理员）
2. RegisterView - 用户注册
3. ProfileView - 获取/更新个人画像
4. MeView - 获取当前用户信息

## URLs (urls.py)
```python
urlpatterns = [
    path('register/', RegisterView.as_view(), name='register'),
    path('profile/', ProfileView.as_view(), name='profile'),
    path('me/', MeView.as_view(), name='me'),
]
```

## Signals (signals.py)
- 用户创建时自动创建UserProfile

## 配置JWT
在config/urls.py添加JWT token获取和刷新路由:
```python
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

urlpatterns = [
    path('api/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('api/users/', include('apps.users.urls')),
]
```

## 验收标准
1. 能够注册新用户
2. 能够登录获取JWT token
3. 能够使用token访问受保护的接口
4. 能够获取和更新用户画像
5. 所有接口都有适当的权限控制
```

### 验收检查
```bash
# 创建迁移并应用
python manage.py makemigrations users
python manage.py migrate

# 创建超级用户测试
python manage.py createsuperuser

# 启动服务器后测试API
# POST /api/users/register/ - 注册
# POST /api/token/ - 登录
# GET /api/users/me/ - 获取当前用户（需要token）
```

---

## Task 1.3: 创建React前端项目

### 任务描述
使用Vite创建React + TypeScript项目，配置TailwindCSS和基础项目结构。

### AI Code Agent 提示词

```
请创建React前端项目，要求如下：

## 初始化命令
```bash
npm create vite@latest frontend -- --template react-ts
cd frontend
npm install
```

## 安装依赖
```bash
# 核心依赖
npm install react-router-dom@6 zustand axios
npm install @tanstack/react-query
npm install clsx tailwind-merge

# UI相关
npm install tailwindcss postcss autoprefixer
npm install lucide-react
npm install @headlessui/react

# 数学渲染
npm install katex
npm install react-markdown remark-math rehype-katex

# WebSocket
npm install socket.io-client

# 开发依赖
npm install -D @types/katex
npm install -D prettier eslint-config-prettier
```

## 项目结构
创建以下目录结构：
```
frontend/src/
├── components/
│   ├── common/           # 通用组件
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   ├── Modal.tsx
│   │   ├── Loading.tsx
│   │   └── index.ts
│   ├── layout/           # 布局组件
│   │   ├── Header.tsx
│   │   ├── Sidebar.tsx
│   │   ├── MainLayout.tsx
│   │   └── index.ts
│   ├── auth/             # 认证组件
│   │   ├── LoginForm.tsx
│   │   ├── RegisterForm.tsx
│   │   └── index.ts
│   ├── reader/           # 阅读器组件（后续实现）
│   ├── agent/            # Agent组件（后续实现）
│   └── knowledge/        # 知识库组件（后续实现）
├── pages/
│   ├── HomePage.tsx
│   ├── LoginPage.tsx
│   ├── RegisterPage.tsx
│   ├── DashboardPage.tsx
│   ├── ReaderPage.tsx      # 后续实现
│   └── KnowledgePage.tsx   # 后续实现
├── hooks/
│   ├── useAuth.ts
│   ├── useApi.ts
│   └── index.ts
├── stores/
│   ├── authStore.ts
│   ├── uiStore.ts
│   └── index.ts
├── services/
│   ├── api.ts            # Axios实例配置
│   ├── authService.ts
│   └── index.ts
├── types/
│   ├── user.ts
│   ├── document.ts
│   ├── agent.ts
│   └── index.ts
├── utils/
│   ├── cn.ts             # className合并工具
│   ├── storage.ts        # localStorage封装
│   └── index.ts
├── styles/
│   └── globals.css
├── App.tsx
├── main.tsx
└── vite-env.d.ts
```

## 配置文件

### tailwind.config.js
```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
        },
      },
    },
  },
  plugins: [],
}
```

### src/styles/globals.css
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

/* KaTeX样式 */
@import 'katex/dist/katex.min.css';

/* 自定义样式 */
@layer base {
  body {
    @apply bg-gray-50 text-gray-900 antialiased;
  }
}
```

### src/utils/cn.ts
```typescript
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

### src/services/api.ts
```typescript
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 请求拦截器 - 添加token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 响应拦截器 - 处理token过期
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // 尝试刷新token或跳转登录
      localStorage.removeItem('access_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);
```

### src/stores/authStore.ts
```typescript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: number;
  email: string;
  username: string;
  avatar?: string;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  setAuth: (user: User, accessToken: string, refreshToken: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      setAuth: (user, accessToken, refreshToken) =>
        set({
          user,
          accessToken,
          refreshToken,
          isAuthenticated: true,
        }),
      logout: () =>
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
        }),
    }),
    {
      name: 'auth-storage',
    }
  )
);
```

### src/App.tsx
```typescript
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from './stores/authStore';
import MainLayout from './components/layout/MainLayout';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';

const queryClient = new QueryClient();

// 受保护路由组件
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <DashboardPage />
                </MainLayout>
              </ProtectedRoute>
            }
          />
          {/* 后续添加更多路由 */}
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
```

## 环境变量
创建 .env.example:
```
VITE_API_BASE_URL=http://localhost:8000/api
VITE_WS_URL=ws://localhost:8000/ws
```

## 验收标准
1. `npm run dev` 能正常启动
2. TailwindCSS样式生效
3. 路由正常工作
4. 能访问登录和注册页面
5. 状态管理正常工作
```

### 验收检查
```bash
cd frontend
npm run dev
# 访问 http://localhost:5173
# 检查各页面是否正常渲染
```

---

## Task 1.4: 实现登录注册页面

### 任务描述
完成前端登录和注册页面，与后端API对接。

### AI Code Agent 提示词

```
请实现完整的登录注册功能：

## 1. 认证服务 (src/services/authService.ts)

```typescript
import { api } from './api';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  username: string;
  password: string;
  password_confirm: string;
}

export interface AuthResponse {
  access: string;
  refresh: string;
  user: {
    id: number;
    email: string;
    username: string;
  };
}

export const authService = {
  async login(data: LoginRequest): Promise<AuthResponse> {
    const response = await api.post('/token/', data);
    // 获取用户信息
    api.defaults.headers.common['Authorization'] = `Bearer ${response.data.access}`;
    const userResponse = await api.get('/users/me/');
    return {
      access: response.data.access,
      refresh: response.data.refresh,
      user: userResponse.data,
    };
  },

  async register(data: RegisterRequest): Promise<void> {
    await api.post('/users/register/', data);
  },

  async logout(): Promise<void> {
    // 清除本地存储
  },

  async refreshToken(refreshToken: string): Promise<{ access: string }> {
    const response = await api.post('/token/refresh/', { refresh: refreshToken });
    return response.data;
  },
};
```

## 2. 登录表单组件 (src/components/auth/LoginForm.tsx)

设计要求:
- 使用TailwindCSS设计美观的表单
- 包含email和password字段
- 显示加载状态
- 显示错误信息
- 登录成功后跳转到dashboard
- 包含"忘记密码"和"注册"链接

```typescript
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { authService } from '../../services/authService';
import { Button, Input } from '../common';

export function LoginForm() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await authService.login({ email, password });
      setAuth(response.user, response.access, response.refresh);
      localStorage.setItem('access_token', response.access);
      localStorage.setItem('refresh_token', response.refresh);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.detail || '登录失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* 实现表单UI */}
    </form>
  );
}
```

## 3. 注册表单组件 (src/components/auth/RegisterForm.tsx)

设计要求:
- email, username, password, password_confirm 四个字段
- 客户端表单验证
- 密码强度提示
- 注册成功后跳转到登录页

## 4. 登录页面 (src/pages/LoginPage.tsx)

设计要求:
- 居中卡片布局
- 包含Logo和标题
- 美观的视觉设计
- 响应式布局

```typescript
import { LoginForm } from '../components/auth';

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-primary-100">
      <div className="max-w-md w-full mx-4">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900">ScholarMind</h1>
            <p className="text-gray-600 mt-2">学术AI阅读助手</p>
          </div>
          <LoginForm />
        </div>
      </div>
    </div>
  );
}
```

## 5. 注册页面 (src/pages/RegisterPage.tsx)

类似登录页面布局，使用RegisterForm组件。

## 6. 通用组件实现

### Button组件 (src/components/common/Button.tsx)
- 支持variant: primary, secondary, outline, ghost
- 支持size: sm, md, lg
- 支持loading状态
- 支持disabled状态

### Input组件 (src/components/common/Input.tsx)
- 支持label
- 支持error显示
- 支持前后缀图标
- 支持不同类型: text, email, password

## 验收标准
1. 能够正常注册新用户
2. 能够使用注册的账号登录
3. 登录后能跳转到dashboard
4. 未登录访问dashboard会重定向到登录页
5. 表单有适当的验证和错误提示
6. 页面设计美观、响应式
```

---

## Task 1.5: 实现基础布局组件

### 任务描述
创建应用的主布局，包括顶部导航、侧边栏等。

### AI Code Agent 提示词

```
请实现应用的主布局组件：

## 1. Header组件 (src/components/layout/Header.tsx)

设计要求:
- 左侧显示Logo和应用名称
- 中间可以放搜索框（预留）
- 右侧显示用户头像和下拉菜单
- 下拉菜单包含: 个人设置、退出登录
- 固定在顶部，高度64px
- 白色背景，底部有阴影

```typescript
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { User, Settings, LogOut, ChevronDown } from 'lucide-react';

export function Header() {
  const { user, logout } = useAuthStore();
  const [showDropdown, setShowDropdown] = useState(false);

  return (
    <header className="h-16 bg-white border-b border-gray-200 fixed top-0 left-0 right-0 z-50">
      <div className="h-full px-4 flex items-center justify-between">
        {/* Logo */}
        <Link to="/dashboard" className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold">S</span>
          </div>
          <span className="text-xl font-semibold text-gray-900">ScholarMind</span>
        </Link>

        {/* 搜索框预留位置 */}
        <div className="flex-1 max-w-xl mx-8">
          {/* TODO: 全局搜索 */}
        </div>

        {/* 用户菜单 */}
        <div className="relative">
          {/* 实现下拉菜单 */}
        </div>
      </div>
    </header>
  );
}
```

## 2. Sidebar组件 (src/components/layout/Sidebar.tsx)

设计要求:
- 固定在左侧，宽度240px
- 顶部留出Header的高度(64px)
- 导航菜单项:
  - 📊 仪表盘 (/dashboard)
  - 📚 我的文档 (/documents)
  - 📖 阅读器 (/reader) - 后续实现
  - 🧠 知识库 (/knowledge) - 后续实现
  - 🗃️ 复习卡片 (/flashcards) - 后续实现
  - ⚙️ 设置 (/settings)
- 当前路由高亮显示
- 可折叠（移动端）

```typescript
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  FileText, 
  BookOpen, 
  Brain, 
  Layers, 
  Settings 
} from 'lucide-react';
import { cn } from '../../utils/cn';

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: '仪表盘' },
  { to: '/documents', icon: FileText, label: '我的文档' },
  { to: '/reader', icon: BookOpen, label: '阅读器' },
  { to: '/knowledge', icon: Brain, label: '知识库' },
  { to: '/flashcards', icon: Layers, label: '复习卡片' },
  { to: '/settings', icon: Settings, label: '设置' },
];

export function Sidebar() {
  return (
    <aside className="w-60 bg-white border-r border-gray-200 fixed left-0 top-16 bottom-0 overflow-y-auto">
      <nav className="p-4 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn(
                'flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors',
                isActive
                  ? 'bg-primary-50 text-primary-700'
                  : 'text-gray-600 hover:bg-gray-50'
              )
            }
          >
            <item.icon className="w-5 h-5" />
            <span className="font-medium">{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
```

## 3. MainLayout组件 (src/components/layout/MainLayout.tsx)

```typescript
import { Header } from './Header';
import { Sidebar } from './Sidebar';

interface MainLayoutProps {
  children: React.ReactNode;
}

export default function MainLayout({ children }: MainLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <Sidebar />
      <main className="ml-60 pt-16 p-6">
        {children}
      </main>
    </div>
  );
}
```

## 4. Dashboard页面 (src/pages/DashboardPage.tsx)

设计要求:
- 欢迎消息，显示用户名
- 统计卡片: 文档数量、问答次数、学习时长、连续天数
- 最近文档列表（预留）
- 学习进度图表（预留）

```typescript
import { useAuthStore } from '../stores/authStore';
import { FileText, MessageSquare, Clock, Flame } from 'lucide-react';

export default function DashboardPage() {
  const user = useAuthStore((state) => state.user);

  const stats = [
    { label: '文档数量', value: 0, icon: FileText, color: 'blue' },
    { label: '问答次数', value: 0, icon: MessageSquare, color: 'green' },
    { label: '学习时长', value: '0h', icon: Clock, color: 'purple' },
    { label: '连续学习', value: '0天', icon: Flame, color: 'orange' },
  ];

  return (
    <div>
      {/* 欢迎区域 */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          欢迎回来，{user?.username}
        </h1>
        <p className="text-gray-600 mt-1">
          今天也要继续学习哦！
        </p>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="bg-white rounded-xl p-6 shadow-sm border border-gray-100"
          >
            {/* 实现统计卡片UI */}
          </div>
        ))}
      </div>

      {/* 最近文档区域（预留） */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">最近文档</h2>
        <p className="text-gray-500">暂无文档，去上传第一篇文档吧</p>
      </div>
    </div>
  );
}
```

## 验收标准
1. 布局正确显示，Header固定顶部，Sidebar固定左侧
2. 导航菜单点击能正确跳转
3. 当前路由菜单项高亮显示
4. 用户下拉菜单正常工作
5. 退出登录功能正常
6. Dashboard页面正确显示用户信息
7. 响应式布局在不同屏幕尺寸下正常显示
```

---

## Task 1.6: Docker开发环境配置

### 任务描述
配置Docker Compose开发环境，包含所有必要服务。

### AI Code Agent 提示词

```
请创建Docker开发环境配置：

## 目录结构
```
docker/
├── Dockerfile.backend
├── Dockerfile.frontend
├── nginx/
│   └── nginx.conf
└── docker-compose.yml (放在项目根目录)
```

## docker-compose.yml (项目根目录)

```yaml
version: '3.8'

services:
  # PostgreSQL数据库
  db:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: scholarmind
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 5s
      retries: 5

  # Redis
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 5s
      retries: 5

  # Django后端
  backend:
    build:
      context: ./backend
      dockerfile: ../docker/Dockerfile.backend
    command: >
      sh -c "python manage.py migrate &&
             python manage.py runserver 0.0.0.0:8000"
    volumes:
      - ./backend:/app
      - backend_media:/app/media
    ports:
      - "8000:8000"
    environment:
      - DEBUG=True
      - DATABASE_URL=postgres://postgres:postgres@db:5432/scholarmind
      - REDIS_URL=redis://redis:6379/0
      - SECRET_KEY=dev-secret-key-change-in-production
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_healthy

  # Celery Worker
  celery:
    build:
      context: ./backend
      dockerfile: ../docker/Dockerfile.backend
    command: celery -A config worker -l info
    volumes:
      - ./backend:/app
    environment:
      - DEBUG=True
      - DATABASE_URL=postgres://postgres:postgres@db:5432/scholarmind
      - REDIS_URL=redis://redis:6379/0
      - SECRET_KEY=dev-secret-key-change-in-production
    depends_on:
      - backend
      - redis

  # React前端
  frontend:
    build:
      context: ./frontend
      dockerfile: ../docker/Dockerfile.frontend
    command: npm run dev -- --host
    volumes:
      - ./frontend:/app
      - /app/node_modules
    ports:
      - "5173:5173"
    environment:
      - VITE_API_BASE_URL=http://localhost:8000/api
      - VITE_WS_URL=ws://localhost:8000/ws

volumes:
  postgres_data:
  redis_data:
  backend_media:
```

## docker/Dockerfile.backend

```dockerfile
FROM python:3.11-slim

WORKDIR /app

# 安装系统依赖
RUN apt-get update && apt-get install -y \
    libpq-dev \
    gcc \
    libmagic1 \
    && rm -rf /var/lib/apt/lists/*

# 安装Python依赖
COPY requirements/base.txt requirements/development.txt ./requirements/
RUN pip install --no-cache-dir -r requirements/development.txt

# 复制项目文件
COPY . .

EXPOSE 8000

CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]
```

## docker/Dockerfile.frontend

```dockerfile
FROM node:20-alpine

WORKDIR /app

# 复制package文件
COPY package*.json ./

# 安装依赖
RUN npm install

# 复制项目文件
COPY . .

EXPOSE 5173

CMD ["npm", "run", "dev", "--", "--host"]
```

## Makefile (项目根目录)

创建便捷命令:

```makefile
.PHONY: up down build logs shell migrate

# 启动所有服务
up:
	docker-compose up -d

# 停止所有服务
down:
	docker-compose down

# 构建镜像
build:
	docker-compose build

# 查看日志
logs:
	docker-compose logs -f

# 后端日志
logs-backend:
	docker-compose logs -f backend

# 前端日志
logs-frontend:
	docker-compose logs -f frontend

# 进入后端shell
shell:
	docker-compose exec backend python manage.py shell

# 运行迁移
migrate:
	docker-compose exec backend python manage.py migrate

# 创建超级用户
createsuperuser:
	docker-compose exec backend python manage.py createsuperuser

# 重启后端
restart-backend:
	docker-compose restart backend

# 清理所有数据
clean:
	docker-compose down -v
```

## 验收标准
1. `docker-compose up` 能启动所有服务
2. PostgreSQL和Redis正常运行
3. 后端能连接数据库和Redis
4. 前端开发服务器正常运行
5. 热重载功能正常工作
6. 各服务之间能正常通信
```

---

## Phase 1 完成检查清单

在进入Phase 2之前，请确认以下所有项目已完成：

- [ ] Django项目创建完成，配置正确
- [ ] Users应用实现完成，包含:
  - [ ] CustomUser模型
  - [ ] UserProfile模型
  - [ ] 注册API
  - [ ] JWT认证
  - [ ] 用户信息API
- [ ] React项目创建完成，包含:
  - [ ] 项目结构
  - [ ] TailwindCSS配置
  - [ ] 路由配置
  - [ ] 状态管理
  - [ ] API服务
- [ ] 认证功能完整:
  - [ ] 登录页面
  - [ ] 注册页面
  - [ ] 受保护路由
- [ ] 布局组件完成:
  - [ ] Header
  - [ ] Sidebar
  - [ ] MainLayout
  - [ ] Dashboard页面
- [ ] Docker环境配置完成
- [ ] 所有基础功能测试通过

完成以上所有检查项后，可以继续Phase 2。
