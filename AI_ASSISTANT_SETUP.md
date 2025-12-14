# ScholarMind AI 助手设置指南

## 概述

ScholarMind AI 助手是一个基于 DeepSeek API 的智能学术助手，集成在仪表板中，可以帮助用户处理文档、创建笔记、回答学术问题等。

## 功能特性

### 🤖 智能对话
- 自然语言交互界面
- 基于用户当前页面提供上下文感知回答
- 实时对话历史记录

### 📚 学术场景优化
- 文档处理指导
- 笔记创建建议
- 学习策略推荐
- 概念管理帮助

### 🎯 页面感知能力
- 自动识别用户所在页面
- 根据页面类型提供相关建议
- 智能操作推荐

## 安装和配置

### 1. 前端配置

#### 环境变量设置
在 `frontend/.env` 文件中添加：

```bash
# API 基础地址
VITE_API_BASE_URL=http://localhost:8000/api/

# DeepSeek API 密钥（仅用于开发测试）
VITE_DEEPSEEK_API_KEY=your_deepseek_api_key_here
```

#### 获取 DeepSeek API 密钥
1. 访问 [DeepSeek 官网](https://platform.deepseek.com/)
2. 注册并登录账户
3. 前往 API Keys 页面
4. 创建新的 API 密钥
5. 复制密钥并添加到环境变量中

### 2. 后端服务设置

#### 安装依赖
```bash
cd backend
pip install -r requirements.txt
```

#### 配置环境变量
```bash
cp .env.example .env
# 编辑 .env 文件，添加你的 DeepSeek API 密钥
DEEPSEEK_API_KEY=your_deepseek_api_key_here
```

#### 启动服务
```bash
# 方式1: 直接运行
python start.py

# 方式2: 使用 uvicorn
uvicorn api_ai_chat:app --host 0.0.0.0 --port 8000 --reload
```

### 3. 启动前端
```bash
cd frontend
npm run dev
```

## 使用方法

### 启动 AI 助手
1. 登录到 ScholarMind 系统
2. 进入仪表板页面
3. 点击"询问AI助手"按钮
4. 聊天窗口将在右下角打开

### 与 AI 助手对话
1. 在输入框中输入你的问题
2. 按 Enter 发送消息
3. AI 助手会基于当前页面上下文提供回答

### 支持的功能场景

#### 仪表板页面
- 文档上传指导
- 笔记创建建议
- 学习计划推荐

#### 文档页面
- 文档搜索帮助
- 阅读建议
- 标注技巧

#### 知识库页面
- 概念管理指导
- 学习卡片创建
- 复习策略

## API 接口

### 聊天接口
```
POST /api/ai/chat
```

#### 请求格式
```json
{
  "message": "用户输入的消息",
  "context": {
    "currentPage": "/dashboard",
    "pageTitle": "仪表板",
    "pageType": "dashboard",
    "availableActions": ["upload_document", "create_note"],
    "userInfo": {
      "name": "用户名",
      "email": "user@example.com"
    }
  },
  "conversationHistory": [
    {
      "role": "user",
      "content": "之前的问题"
    },
    {
      "role": "assistant",
      "content": "之前的回答"
    }
  ]
}
```

#### 响应格式
```json
{
  "response": "AI 助手的回答",
  "sources": [
    {
      "type": "document",
      "title": "相关文档标题",
      "url": "文档链接",
      "excerpt": "相关片段"
    }
  ],
  "suggestedActions": [
    {
      "type": "navigate",
      "label": "前往文档页面",
      "action": "/documents"
    }
  ]
}
```

## 故障排除

### 常见问题

#### 1. 页面黑屏
**原因**: 可能是 AI 组件导入错误
**解决**: 检查浏览器控制台错误信息，确保所有依赖正确安装

#### 2. AI 不响应
**原因**: DeepSeek API 密钥未配置或无效
**解决**:
- 检查 `.env` 文件中的 API 密钥
- 确认 DeepSeek 账户余额充足
- 验证网络连接

#### 3. 后端服务启动失败
**原因**: Python 依赖缺失
**解决**:
```bash
pip install -r backend/requirements.txt
```

#### 4. CORS 错误
**原因**: 前后端域名配置问题
**解决**: 确保后端 CORS 配置包含前端地址

### 调试模式

#### 启用详细日志
```bash
# 后端调试
export DEBUG=1
python backend/start.py

# 前端调试
# 打开浏览器开发者工具，查看 Console 和 Network 标签
```

## 安全注意事项

### 🔒 API 密钥保护
- **生产环境**: 务必在后端配置 DeepSeek API 密钥，不要在前端暴露
- **开发环境**: 前端配置仅用于测试，不要提交到版本控制

### 🔒 用户数据保护
- API 不会存储用户对话记录
- 建议定期轮换 API 密钥
- 监控 API 使用量和费用

## 性能优化

### 前端优化
- 使用 React.memo 优化组件渲染
- 实现消息虚拟化（大量对话时）
- 添加对话持久化存储

### 后端优化
- 实现 API 调用缓存
- 添加请求限流
- 监控响应时间

## 扩展功能

### 计划中的功能
- 📎 文件附件支持
- 🔍 上下文搜索
- 💾 对话历史保存
- 🌐 多语言支持
- 📊 使用统计

### 自定义配置
- 修改 `buildSystemPrompt()` 函数定制 AI 助手行为
- 扩展 `generateSuggestedActions()` 添加更多操作建议
- 自定义 UI 主题和样式

## 支持

如有问题，请：
1. 查看本文档的故障排除部分
2. 检查 GitHub Issues
3. 联系开发团队

---

**注意**: 本功能需要有效的 DeepSeek API 密钥才能正常工作。请确保遵守相关服务的使用条款。