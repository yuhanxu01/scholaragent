# 全局选择工具栏故障排除指南

## 🔍 调试步骤

### 第一步：检查浏览器控制台

1. 访问 http://localhost:5173
2. 登录进入应用
3. 打开浏览器控制台（F12 或右键 → 检查 → Console）
4. 查看是否有以下日志：
   ```
   🔧 Global dictionary hook initialized
   👂 Adding selectionchange listener
   ```

### 第二步：测试文本选择

1. 在任何页面选择一些文本（拖动鼠标选择）
2. 控制台应该显示：
   ```
   🔍 Selection change detected
   ✅ Text selected: [你选择的文本]
   ⏰ Timeout triggered, showing toolbar
   🎯 Toolbar position: [x, y]
   ✨ Showing toolbar for: [文本]
   🎨 GlobalSelectionToolbar mounted with text: [文本]
   ```

### 第三步：检查工具栏显示

如果控制台有正确日志但看不到工具栏，可能的问题：

1. **CSS样式问题** - 工具栏可能被其他元素遮挡
2. **z-index问题** - 工具栏可能在页面底层
3. **位置计算问题** - 工具栏可能在屏幕外

## 🛠️ 常见问题及解决方案

### 问题1：完全没有调试日志

**可能原因**：
- GlobalDictionaryProvider没有被正确加载
- Hook没有被初始化

**解决方案**：
1. 检查 App.tsx 中是否正确导入和使用 GlobalDictionaryProvider
2. 刷新页面并检查是否有网络错误
3. 确认没有JavaScript错误阻止Hook执行

### 问题2：有选择日志但没有工具栏

**可能原因**：
- CSS样式问题
- 工具栏组件渲染问题
- 位置计算错误

**解决方案**：
1. 在控制台运行以下代码检查工具栏元素：
   ```javascript
   // 查找工具栏元素
   const toolbar = document.querySelector('.global-selection-toolbar');
   console.log('Toolbar element:', toolbar);

   // 查看工具栏样式
   if (toolbar) {
     const styles = window.getComputedStyle(toolbar);
     console.log('Toolbar styles:', {
       display: styles.display,
       visibility: styles.visibility,
       opacity: styles.opacity,
       zIndex: styles.zIndex,
       left: styles.left,
       top: styles.top
     });
   }
   ```

### 问题3：工具栏位置错误

**可能原因**：
- 坐标计算问题
- 屏幕边界检测问题

**解决方案**：
1. 在控制台查看位置计算日志
2. 手动测试工具栏位置：
   ```javascript
   // 创建一个测试工具栏
   const testToolbar = document.createElement('div');
   testToolbar.className = 'global-selection-toolbar fixed z-50 bg-white rounded-lg shadow-xl border border-gray-200 p-1 flex gap-1';
   testToolbar.style.left = '100px';
   testToolbar.style.top = '100px';
   testToolbar.innerHTML = '<span>Test Toolbar</span>';
   document.body.appendChild(testToolbar);
   ```

## 🔧 手动测试

如果自动选择不工作，可以手动触发测试：

1. 在控制台运行：
```javascript
// 手动触发工具栏显示
const event = new CustomEvent('show-toolbar', {
  detail: {
    text: 'test word',
    position: { x: 200, y: 200 }
  }
});
document.dispatchEvent(event);
```

## 📱 检查清单

- [ ] 浏览器控制台没有JavaScript错误
- [ ] 看到了初始化日志（🔧 Global dictionary hook initialized）
- [ ] 选择文本后看到选择日志（🔍 Selection change detected）
- [ ] 工具栏元素确实存在于DOM中
- [ ] 工具栏的CSS样式正确（z-index, position, display）
- [ ] 工具栏位置在屏幕可见区域内

## 🚨 如果仍然不工作

如果以上步骤都无法解决问题，请：

1. 提供浏览器控制台的完整错误日志
2. 说明你在哪个页面进行的测试
3. 描述你选择文本的具体操作
4. 截图显示控制台输出和页面状态

这些信息将帮助进一步诊断问题。