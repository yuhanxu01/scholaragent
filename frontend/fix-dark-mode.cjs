#!/usr/bin/env node

/**
 * 夜间模式批量修复脚本
 * 自动为缺少 dark: 样式的组件添加夜间模式样式
 */

const fs = require('fs');
const path = require('path');

// 样式映射：日间模式 -> 夜间模式
const STYLE_MAPPING = {
  // 背景色
  'bg-white': 'bg-white dark:bg-gray-800',
  'bg-gray-50': 'bg-gray-50 dark:bg-gray-900',
  'bg-gray-100': 'bg-gray-100 dark:bg-gray-800',
  'bg-gray-200': 'bg-gray-200 dark:bg-gray-700',
  
  // 文字颜色
  'text-gray-900': 'text-gray-900 dark:text-gray-100',
  'text-gray-800': 'text-gray-800 dark:text-gray-200',
  'text-gray-700': 'text-gray-700 dark:text-gray-300',
  'text-gray-600': 'text-gray-600 dark:text-gray-400',
  
  // 边框颜色
  'border-gray-200': 'border-gray-200 dark:border-gray-700',
  'border-gray-300': 'border-gray-300 dark:border-gray-600',
};

function fixClassName(className) {
  let fixed = className;
  
  // 应用样式映射
  for (const [light, dark] of Object.entries(STYLE_MAPPING)) {
    // 使用正则表达式确保精确匹配，避免部分匹配
    const regex = new RegExp(`\\b${light}\\b`, 'g');
    fixed = fixed.replace(regex, dark);
  }
  
  return fixed;
}

function scanAndFixFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf-8');
  const originalContent = content;
  let changes = 0;
  
  // 查找并修复 className 属性
  const classNameRegex = /className=["'{]([^"'}]+)["'}]/g;
  let match;
  
  while ((match = classNameRegex.exec(content)) !== null) {
    const originalClassName = match[1];
    const fixedClassName = fixClassName(originalClassName);
    
    if (originalClassName !== fixedClassName) {
      content = content.replace(
        `className="${originalClassName}"`,
        `className="${fixedClassName}"`
      );
      changes++;
    }
  }
  
  // 处理 template literals 中的 className
  const templateClassNameRegex = /className=\{`([^`}]+)`\}/g;
  while ((match = templateClassNameRegex.exec(content)) !== null) {
    const originalClassName = match[1];
    const fixedClassName = fixClassName(originalClassName);
    
    if (originalClassName !== fixedClassName) {
      content = content.replace(
        `className={\`${originalClassName}\`}`,
        `className={\`${fixedClassName}\`}`
      );
      changes++;
    }
  }
  
  // 保存修改后的文件
  if (changes > 0) {
    fs.writeFileSync(filePath, content, 'utf-8');
    console.log(`✅ ${path.relative(process.cwd(), filePath)} - 修复了 ${changes} 个样式类`);
    return true;
  }
  
  return false;
}

function main() {
  console.log('开始批量修复夜间模式样式...\n');
  
  // 从审计报告中读取需要修复的文件
  let reportPath = path.join(__dirname, 'dark-mode-audit-report.json');
  
  if (!fs.existsSync(reportPath)) {
    console.error('❌ 未找到审计报告文件。请先运行 audit-dark-mode.cjs');
    process.exit(1);
  }
  
  const report = JSON.parse(fs.readFileSync(reportPath, 'utf-8'));
  const filesToFix = Object.keys(report.issuesByFile);
  
  let fixedFiles = 0;
  let totalChanges = 0;
  
  console.log('修复进度:');
  console.log('='.repeat(50));
  
  for (const file of filesToFix) {
    if (fs.existsSync(file)) {
      const changes = scanAndFixFile(file);
      if (changes) {
        fixedFiles++;
      }
    } else {
      console.log(`⚠️  文件不存在: ${file}`);
    }
  }
  
  console.log('='.repeat(50));
  console.log(`\n修复完成！`);
  console.log(`修复文件数: ${fixedFiles}/${filesToFix.length}`);
  console.log('请重新运行审计脚本验证修复效果。');
}

if (require.main === module) {
  main();
}

module.exports = { fixClassName, STYLE_MAPPING };
