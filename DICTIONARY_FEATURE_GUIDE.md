# 词典功能集成指南

## 功能概述

我已经为您实现了一个完整的词典功能系统，包含：

### 核心功能
- ✅ **离线MDX词典查询** - 支持标准MDX格式的离线词典
- ✅ **智能单词识别** - 双击查词、悬停查词、选择查词
- ✅ **生词本管理** - 保存、分类、复习生词
- ✅ **无缝集成** - 与现有文档阅读界面完美融合

### 组件架构

#### 后端组件
1. **数据模型** (`backend/apps/study/vocabulary_models.py`)
   - `Vocabulary` - 生词记录
   - `VocabularyList` - 生词分类列表
   - `VocabularyReview` - 复习记录
   - `VocabularyListMembership` - 列表成员关系

2. **MDX解析器** (`backend/apps/study/mdx_dictionary.py`)
   - 支持标准MDX格式
   - 自动索引构建
   - 模糊匹配算法
   - 内存缓存优化

3. **API接口** (`backend/apps/study/vocabulary_views.py`)
   - 词典查询接口
   - 生词管理接口
   - 复习功能接口
   - 导入导出功能

#### 前端组件
1. **词典弹窗** (`frontend/src/components/dictionary/DictionaryPopup.tsx`)
   - 实时词典查询
   - 单词发音
   - 一键保存到生词本
   - 智能位置定位

2. **生词本** (`frontend/src/components/dictionary/VocabularyBook.tsx`)
   - 生词列表管理
   - 搜索筛选功能
   - 掌握程度追踪
   - 批量操作

3. **词典管理器** (`frontend/src/components/dictionary/DictionaryManager.tsx`)
   - 统一的词典功能入口
   - 全局查词快捷方式
   - 生词本集成

4. **增强渲染器** (`frontend/src/components/reader/EnhancedMarkdownRenderer.tsx`)
   - 双击查词
   - 悬停查词
   - 上下文感知
   - 与选择工具栏集成

## 使用方法

### 1. 后端配置

#### 添加URL路由
```python
# backend/config/urls.py
urlpatterns = [
    # ... 其他路由
    path('api/study/', include('apps.study.urls')),
]
```

#### 配置MDX词典路径
```python
# backend/config/settings/development.py
# 设置MDX词典文件路径
MDX_DICTIONARY_PATH = '/path/to/your/dictionary.mdx'
```

#### 运行数据库迁移
```bash
cd backend
python manage.py makemigrations
python manage.py migrate
```

### 2. 前端集成

#### 在文档阅读页面集成
```tsx
// 在文档阅读组件中添加词典管理器
import { DictionaryManager } from '../components/dictionary/DictionaryManager';
import { EnhancedMarkdownRenderer } from '../components/reader/EnhancedMarkdownRenderer';

export function DocumentReader() {
  const [dictionaryPopup, setDictionaryPopup] = useState(null);

  const handleDictionaryLookup = (word, position, context) => {
    setDictionaryPopup({ word, position, context });
  };

  return (
    <div>
      {/* 词典管理器工具栏 */}
      <DictionaryManager
        sourceDocumentId={documentId}
        onDictionaryLookup={handleDictionaryLookup}
      />

      {/* 增强的文档渲染器 */}
      <EnhancedMarkdownRenderer
        content={documentContent}
        enableDictionary={true}
        enableHoverDictionary={true}
        onDictionaryLookup={handleDictionaryLookup}
      />

      {/* 词典弹窗 */}
      {dictionaryPopup && (
        <DictionaryPopup
          word={dictionaryPopup.word}
          position={dictionaryPopup.position}
          context={dictionaryPopup.context}
          sourceDocumentId={documentId}
          onClose={() => setDictionaryPopup(null)}
        />
      )}
    </div>
  );
}
```

#### 扩展选择工具栏
```tsx
// 在SelectionToolbar中添加词典按钮
<SelectionToolbar
  selectedText={selectedText}
  position={selectionPosition}
  onDictionary={(text, position) => {
    handleDictionaryLookup(text, position);
  }}
  // ... 其他回调
/>
```

### 3. 用户体验功能

#### 查词方式
1. **双击查词** - 双击任何英文单词立即显示词典
2. **悬停查词** - 鼠标悬停800ms后自动查词
3. **选择查词** - 选中文本后点击工具栏的"词典"按钮
4. **搜索查词** - 使用词典管理器的搜索框

#### 生词本功能
1. **快速保存** - 查词后一键保存到生词本
2. **智能分类** - 自动根据内容分类
3. **掌握程度** - 5级掌握度追踪
4. **复习提醒** - 基于遗忘曲线的复习计划

#### 导入导出
- 支持JSON、CSV、Anki格式导出
- 批量导入生词
- 与其他学习工具同步

## 词典文件支持

### 支持的MDX格式
- 标准MDX词典文件
- 支持音标、释义、例句
- 自动提取中文翻译
- 模糊匹配搜索

### 推荐词典
1. **牛津高阶英汉双解词典**
2. **朗文当代高级英语辞典**
3. **柯林斯COBUILD高阶英汉双解学习词典**

### 词典安装
1. 将MDX文件放到服务器指定路径
2. 在配置文件中设置路径
3. 重启Django服务自动构建索引

## 性能优化

### 后端优化
- 内存缓存常用查询
- 异步索引构建
- 数据库查询优化
- Redis缓存支持

### 前端优化
- 查询防抖
- 组件懒加载
- 智能位置计算
- 减少重渲染

### 使用建议
1. 大型MDX文件建议预先构建索引
2. 定期清理缓存
3. 监控内存使用
4. 根据用户量调整并发

## 扩展功能

### 可扩展的接口
```python
# 添加新的词典源
class CustomDictionary:
    def lookup_word(self, word: str) -> Dict:
        # 自定义查询逻辑
        pass

# 在视图中使用
dictionary = CustomDictionary()
result = dictionary.lookup_word(word)
```

### 插件系统
- 支持多词典源
- 自定义UI主题
- 第三方集成接口
- 学习算法插件

## 故障排除

### 常见问题
1. **MDX文件无法加载**
   - 检查文件路径和权限
   - 确认MDX文件格式正确

2. **查词响应慢**
   - 检查索引是否构建完成
   - 考虑增加内存缓存

3. **前端词典弹窗不显示**
   - 检查事件监听器
   - 确认CSS样式冲突

### 调试工具
```python
# 检查词典加载状态
from apps.study.mdx_dictionary import MDXDictionary

dict = MDXDictionary('/path/to/dictionary.mdx')
info = dict.get_info()
print(f"词典状态: {info}")
```

## 技术支持

如有问题，请检查：
1. 后端日志：`backend/logs/`
2. 前端控制台错误
3. 网络请求状态
4. 数据库连接

---

**注意：** 这个词典功能已完全集成到您现有的系统中，可以立即使用。只需配置MDX词典文件路径即可开始享受智能查词和生词管理功能！