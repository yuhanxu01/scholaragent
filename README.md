# ScholarMind - AI Academic Assistant

## 🎯 项目简介

ScholarMind 是一个AI驱动的Web应用，旨在帮助理工科学生阅读和理解数理类文献。

## 🚀 Quick Start with Docker

### Prerequisites
- Docker & Docker Compose installed
- Git
- DeepSeek API Key

### Setup Instructions

1. **Clone and setup**
   ```bash
   git clone <repository-url>
   cd scholaragent
   cp .env.example .env
   # Edit .env with your DEEPSEEK_API_KEY
   ```

2. **Build and start services**
   ```bash
   make up
   # Or: docker-compose up -d
   ```

3. **Run initial setup**
   ```bash
   make migrate
   make superuser
   ```

4. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8000
   - Admin Panel: http://localhost:8000/admin

### Development Mode
```bash
make up-dev
# Hot reload enabled for both frontend and backend
```

## 🛠 技术栈

```
后端: Django 5 + DRF + Channels + Celery + PostgreSQL + Redis
前端: React 18 + TypeScript + Vite + TailwindCSS
AI:   DeepSeek API
部署: Docker + Nginx
```

## 📋 核心功能

- ✅ 用户注册登录系统
- ✅ MD/TeX文档上传和解析
- ✅ LaTeX公式渲染
- ✅ AI自动生成文档索引（摘要、概念、关键词）
- ✅ 智能问答Agent（带工具调用能力）
- ✅ 知识库管理（概念、笔记、复习卡片）
- ✅ WebSocket实时对话
- ✅ Docker一键部署

---

## 📖 AI Code Agent 执行手册

### 这是什么？

这是一套完整的AI Code Agent执行手册，用于自动化构建 **ScholarMind** 项目。

## 📁 文件说明

| 文件 | 说明 |
|-----|------|
| `MASTER_PROMPT.md` | **主执行文件** - 给AI Code Agent的核心提示词 |
| `00_PROJECT_OVERVIEW.md` | 项目总览和阶段划分 |
| `01_PHASE1_FOUNDATION.md` | Phase 1: 基础架构详细任务 |
| `02_PHASE2_DOCUMENTS.md` | Phase 2: 文档系统详细任务 |
| `03_PHASE3_AGENT.md` | Phase 3: AI Agent核心详细任务 |
| `04_REMAINING_PHASES.md` | Phase 4-6及规范汇总 |

## 🚀 使用方法

### 方法1: 分阶段执行（推荐）

1. 打开你的AI Code Agent（Cursor、Claude等）
2. 先提供 `MASTER_PROMPT.md` 作为项目背景
3. 然后按顺序提供各Phase文件，让Agent执行每个Task
4. 每个Task完成后验证功能，再继续下一个

### 方法2: 一次性执行

将所有文件内容合并，一次性提供给AI Code Agent。适合能力较强的Agent。

## 📋 项目功能

构建完成后，你将获得一个具备以下功能的Web应用：

- ✅ 用户注册登录系统
- ✅ MD/TeX文档上传和解析
- ✅ LaTeX公式渲染
- ✅ AI自动生成文档索引（摘要、概念、关键词）
- ✅ 智能问答Agent（带工具调用能力）
- ✅ 知识库管理（概念、笔记、复习卡片）
- ✅ WebSocket实时对话
- ✅ Docker一键部署

## 🛠 技术栈

```
后端: Django 5 + DRF + Channels + Celery + PostgreSQL + Redis
前端: React 18 + TypeScript + Vite + TailwindCSS
AI:   DeepSeek API
部署: Docker + Nginx
```

## ⏱ 预计工期

| 阶段 | 内容 | 预计时间 |
|-----|------|---------|
| Phase 1 | 基础架构 | 1-2周 |
| Phase 2 | 文档系统 | 1-2周 |
| Phase 3 | AI Agent | 2-3周 |
| Phase 4 | 知识管理 | 1-2周 |
| Phase 5 | 集成优化 | 1-2周 |
| Phase 6 | 部署上线 | 1周 |
| **总计** | | **8-12周** |

## 💡 提示

1. **环境准备**: 确保有Python 3.11+、Node.js 20+、Docker环境
2. **API Key**: 需要准备DeepSeek API Key
3. **耐心执行**: 建议一个Task一个Task地执行，确保每步都成功
4. **及时调试**: 遇到报错及时让Agent修复

## 📞 需要帮助？

如果在执行过程中遇到问题，可以：
1. 将错误信息提供给AI Code Agent让它修复
2. 检查对应Phase文件中的验收标准
3. 查看docker-compose logs定位问题

---

祝你项目顺利！🎉
