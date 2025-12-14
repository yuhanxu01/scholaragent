# ScholarMind - AI Code Agent 执行手册

## 项目总览

### 项目名称
**ScholarMind** - 学术AI Agent阅读助手

### 项目目标
构建一个帮助理工科学生阅读和理解数理类文献的Web应用，具备AI Agent能力，能够自主规划、检索、推理和回答问题。

### 核心功能清单
1. 用户系统（注册、登录、个人设置）
2. 文档管理（上传MD/TeX文件、解析、存储）
3. 文档阅读器（LaTeX渲染、目录导航、标注）
4. AI Agent对话（任务规划、工具调用、多轮对话）
5. 知识库管理（概念索引、笔记、复习卡片）
6. 学习追踪（阅读历史、复习计划）

### 技术栈（固定）
```
后端:
- Python 3.11+
- Django 5.0+
- Django REST Framework
- Django Channels (WebSocket)
- Celery + Redis (异步任务)
- PostgreSQL (主数据库)
- SQLite FTS5 (全文检索)

前端:
- React 18+
- TypeScript
- Vite
- TailwindCSS
- Zustand (状态管理)
- React Router v6

AI/LLM:
- DeepSeek API (主要LLM)
- SymPy (数学计算)

部署:
- Docker + Docker Compose
- Nginx
- Gunicorn
```

### 项目结构预览
```
scholarmind/
├── backend/                 # Django后端
│   ├── config/             # 项目配置
│   ├── apps/               # Django应用
│   │   ├── users/          # 用户系统
│   │   ├── documents/      # 文档管理
│   │   ├── knowledge/      # 知识库
│   │   ├── agent/          # AI Agent核心
│   │   └── study/          # 学习追踪
│   ├── core/               # 核心组件
│   └── tests/              # 测试
├── frontend/               # React前端
│   ├── src/
│   │   ├── components/     # 组件
│   │   ├── pages/          # 页面
│   │   ├── hooks/          # 自定义hooks
│   │   ├── stores/         # 状态管理
│   │   ├── services/       # API服务
│   │   └── types/          # TypeScript类型
│   └── public/
├── docker/                 # Docker配置
├── docs/                   # 项目文档
└── scripts/                # 工具脚本
```

---

## 开发阶段划分

### Phase 1: 基础架构 (Sprint 1-2)
- 项目初始化
- 用户认证系统
- 基础数据模型
- 前端框架搭建

### Phase 2: 文档系统 (Sprint 3-4)
- 文档上传和解析
- LaTeX清洗和渲染
- 文档分块和索引
- 阅读器界面

### Phase 3: AI Agent核心 (Sprint 5-7)
- LLM服务封装
- Agent执行引擎
- 工具系统
- WebSocket实时通信

### Phase 4: 知识管理 (Sprint 8-9)
- 概念索引系统
- 笔记系统
- 复习卡片系统
- 检索功能

### Phase 5: 集成优化 (Sprint 10-11)
- 前后端集成
- 性能优化
- 错误处理
- 部署配置

### Phase 6: 测试上线 (Sprint 12)
- 单元测试
- 集成测试
- 部署上线
- 文档完善

---

## 执行说明

本手册包含以下文件，请按顺序执行：

```
00_PROJECT_OVERVIEW.md      ← 当前文件（项目总览）
01_PHASE1_FOUNDATION.md     ← Phase 1 详细任务
02_PHASE2_DOCUMENTS.md      ← Phase 2 详细任务
03_PHASE3_AGENT.md          ← Phase 3 详细任务
04_PHASE4_KNOWLEDGE.md      ← Phase 4 详细任务
05_PHASE5_INTEGRATION.md    ← Phase 5 详细任务
06_PHASE6_DEPLOYMENT.md     ← Phase 6 详细任务
07_DATA_MODELS.md           ← 完整数据模型定义
08_API_SPECIFICATION.md     ← 完整API规范
09_FRONTEND_COMPONENTS.md   ← 前端组件规范
10_PROMPTS_TEMPLATES.md     ← LLM Prompt模板
```

每个Phase文件包含：
1. 该阶段的目标
2. 详细的任务列表
3. 每个任务的AI Code Agent提示词
4. 验收标准
5. 常见问题处理

**重要**: 每个任务完成后，请运行验收测试确保功能正常，再进行下一个任务。
