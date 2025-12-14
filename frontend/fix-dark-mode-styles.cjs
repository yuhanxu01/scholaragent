#!/usr/bin/env node

/**
 * 批量修复夜间模式样式问题
 * 这个脚本会自动为缺少 dark: 样式类的元素添加相应的夜间模式样式
 */

const fs = require('fs');
const path = require('path');

const WHITE_TO_DARK_MAPPING = {
  'text-gray-900': 'text-gray-900 dark:text-gray-100',
  'text-gray-800': 'text-gray-800 dark:text-gray-200',
  'text-gray-700': 'text-gray-700 dark:text-gray-300',
  'text-gray-600': 'text-gray-600 dark:text-gray-300',
  'text-gray-500': 'text-gray-500 dark:text-gray-400',
  'text-gray-400': 'text-gray-400 dark:text-gray-500',
  'text-gray-300': 'text-gray-300 dark:text-gray-600',
  
  'bg-white': 'bg-white dark:bg-gray-800',
  'bg-gray-50': 'bg-gray-50 dark:bg-gray-700',
  'bg-gray-100': 'bg-gray-100 dark:bg-gray-600',
  'bg-gray-200': 'bg-gray-200 dark:bg-gray-500',
  
  'border-gray-200': 'border-gray-200 dark:border-gray-600',
  'border-gray-300': 'border-gray-300 dark:border-gray-500',
  
  'hover:bg-gray-50': 'hover:bg-gray-50 dark:hover:bg-gray-700',
  'hover:bg-gray-100': 'hover:bg-gray-100 dark:hover:bg-gray-600',
};

const FILES_TO_FIX = [
  'src/pages/DashboardPage.tsx',
  'src/components/common/Button.tsx',
  'src/components/common/Input.tsx',
];

function fixFile(filePath) {
  const fullPath = path.join(__dirname, filePath);
  
  if (!fs.existsSync(fullPath)) {
    console.log(`文件不存在: ${filePath}`);
    return;
  }
  
  let content = fs.readFileSync(fullPath, 'utf8');
  let modified = false;
  
  // 替换缺少 dark: 样式类的样式
  Object.entries(WHITE_TO_DARK_MAPPING).forEach(([original, replacement]) => {
    const regex = new RegExp(`\\b${original.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}\\b`, 'g');
    if (regex.test(content)) {
      const newContent = content.replace(regex, replacement);
      if (newContent !== content) {
        content = newContent;
        modified = true;
        console.log(`修复 ${filePath}: ${original} -> ${replacement}`);
      }
    }
  });
  
  if (modified) {
    fs.writeFileSync(fullPath, content, 'utf8');
    console.log(`已修复: ${filePath}`);
  } else {
    console.log(`无需修复: ${filePath}`);
  }
}

console.log('开始修复夜间模式样式...');

FILES_TO_FIX.forEach(filePath => {
  fixFile(filePath);
});

console.log('修复完成！');