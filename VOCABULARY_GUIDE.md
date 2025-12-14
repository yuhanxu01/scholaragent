# 📚 您的生词本使用指南

## 🎉 生词本已就绪！

您的生词本现在已经完全可用，包含了完整的生词管理功能。

## 📊 您当前的生词本

您已经有 **3 个生词** 在生词本中：

1. **study** (学术类) - 学习；研究；攻读
2. **hello** (日常类) - 喂；你好
3. **computer** (通用类) - 计算机；电脑

## 🔍 如何访问生词本

### 方法1: 通过API接口
您的生词本API位于：`http://localhost:8001/api/study/vocabulary/`

### 方法2: 使用前端组件
我们已经为您创建了完整的前端组件：

```tsx
// 在任何React组件中使用
import { VocabularyBook } from '../components/dictionary/VocabularyBook';

<VocabularyBook />
```

### 方法3: 独立页面
```tsx
// 使用独立页面
import { VocabularyPage } from '../pages/VocabularyPage';

<VocabularyPage />
```

## ✨ 生词本功能特性

### 📖 生词管理
- ✅ **添加生词** - 支持手动添加或查词后一键保存
- ✅ **编辑生词** - 修改释义、音标、翻译等
- ✅ **删除生词** - 移除不需要的生词
- ✅ **收藏标记** - 标记重要生词

### 🏷️ 分类系统
- ✅ **预设分类**: 通用、学术、技术、商务、日常、自定义
- ✅ **自定义标签**: 添加个性化标签
- ✅ **分类筛选**: 按分类快速查找

### 📈 学习追踪
- ✅ **掌握程度**: 1-5级掌握度系统
- ✅ **复习记录**: 记录复习次数和时间
- ✅ **学习状态**: 新生词、已复习、需复习、已掌握
- ✅ **统计信息**: 学习进度和成就

### 🔍 搜索筛选
- ✅ **关键词搜索** - 按单词、释义、翻译搜索
- ✅ **分类筛选** - 按生词分类筛选
- ✅ **掌握度筛选** - 按学习程度筛选
- ✅ **收藏筛选** - 只显示收藏生词
- ✅ **时间排序** - 按创建时间、单词、掌握度排序

## 🚀 快速开始

### 1. 添加更多生词

使用API添加生词：
```bash
curl -X POST "http://localhost:8001/api/study/vocabulary/create/" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "word": "example",
    "pronunciation": "ɪɡˈzæmpəl",
    "translation": "例子；范例",
    "definition": "n. 例子；范例；样品",
    "category": "general"
  }'
```

### 2. 查看生词列表

```bash
curl -X GET "http://localhost:8001/api/study/vocabulary/" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### 3. 更新生词掌握度

```bash
curl -X POST "http://localhost:8001/api/study/vocabulary/{id}/update/" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{"mastery_level": 3}'
```

### 4. 收藏生词

```bash
curl -X POST "http://localhost:8001/api/study/vocabulary/{id}/favorite/" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

## 📱 前端集成

### 在文档阅读器中集成

```tsx
import React, { useState } from 'react';
import { DictionaryManager } from '../components/dictionary/DictionaryManager';
import { VocabularyBook } from '../components/dictionary/VocabularyBook';

export function DocumentReader() {
  const [showVocabulary, setShowVocabulary] = useState(false);

  return (
    <div>
      {/* 文档内容 */}
      <div className="document-content">
        {/* ... */}
      </div>

      {/* 词典管理工具栏 */}
      <DictionaryManager
        sourceDocumentId={documentId}
      />

      {/* 生词本 */}
      {showVocabulary && (
        <div className="vocabulary-section">
          <h3>我的生词本</h3>
          <VocabularyBook />
        </div>
      )}
    </div>
  );
}
```

### 与词典功能集成

```tsx
import { EnhancedMarkdownRenderer } from '../components/reader/EnhancedMarkdownRenderer';

export function DocumentViewer({ content }) {
  return (
    <EnhancedMarkdownRenderer
      content={content}
      enableDictionary={true}
      enableHoverDictionary={true}
      onDictionaryLookup={(word, position, context) => {
        // 自动弹出词典查词
        // 可以选择保存到生词本
      }}
    />
  );
}
```

## 🎯 学习建议

### 1. 建立学习习惯
- 每天添加5-10个生词
- 定期复习旧生词
- 根据掌握度调整学习重点

### 2. 有效分类
- 按主题分类（如：计算机、商务、日常）
- 按难度分类（初级、中级、高级）
- 按来源分类（文章、视频、书籍）

### 3. 掌握度标准
- **Level 1**: 刚接触，需要反复记忆
- **Level 2**: 基本认识，偶尔会忘记
- **Level 3**: 比较熟悉，能够正确使用
- **Level 4**: 熟练掌握，反应迅速
- **Level 5**: 完全掌握，形成语感

## 🔧 配置说明

### 前端配置

确保您的API服务配置正确：

```typescript
// frontend/src/services/dictionaryService.ts
const API_BASE_URL = 'http://localhost:8001/api';

// 在生产环境中使用实际域名
const API_BASE_URL = process.env.NODE_ENV === 'production'
  ? 'https://your-domain.com/api'
  : 'http://localhost:8001/api';
```

### 后端配置

后端已在 `8001` 端口运行，包含完整的生词本API。

## 📞 技术支持

如果遇到问题：

1. **API错误**: 检查认证令牌是否有效
2. **网络问题**: 确认后端服务正在运行
3. **数据问题**: 数据库可能需要重启服务

---

## 🎊 总结

您的生词本现在已经完全可用！

✅ **3个生词已添加** - 可以立即开始管理
✅ **完整的API接口** - 支持所有CRUD操作
✅ **前端组件就绪** - 直接集成到您的应用
✅ **学习追踪功能** - 掌握度和复习记录

**下一步:** 将生词本组件集成到您的文档阅读界面中，用户就可以享受完整的查词和学习体验了！🚀