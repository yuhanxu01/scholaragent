#!/usr/bin/env node

/**
 * 批量修复所有组件中的夜间模式问题
 * 这个脚本会自动为缺少 dark: 样式类的元素添加相应的夜间模式样式
 */

const fs = require('fs');
const path = require('path');

const COMMON_FIXES = {
  // 背景色
  'bg-white': 'bg-white dark:bg-gray-800',
  'bg-gray-50': 'bg-gray-50 dark:bg-gray-900',
  'bg-gray-100': 'bg-gray-100 dark:bg-gray-700',
  'bg-gray-200': 'bg-gray-200 dark:bg-gray-600',
  
  // 文本色
  'text-gray-900': 'text-gray-900 dark:text-gray-100',
  'text-gray-800': 'text-gray-800 dark:text-gray-200',
  'text-gray-700': 'text-gray-700 dark:text-gray-300',
  'text-gray-600': 'text-gray-600 dark:text-gray-400',
  'text-gray-500': 'text-gray-500 dark:text-gray-500',
  
  // 边框色
  'border-gray-200': 'border-gray-200 dark:border-gray-700',
  'border-gray-300': 'border-gray-300 dark:border-gray-600',
  
  // 悬停状态
  'hover:bg-gray-50': 'hover:bg-gray-50 dark:hover:bg-gray-700',
  'hover:bg-gray-100': 'hover:bg-gray-100 dark:hover:bg-gray-600',
  'hover:text-gray-600': 'hover:text-gray-600 dark:hover:text-gray-400',
  'hover:text-gray-700': 'hover:text-gray-700 dark:hover:text-gray-300',
};

// 需要特殊处理的文件（排除已经修复的文件）
const EXCLUDED_FILES = [
  'src/components/knowledge/ConceptGraph.tsx',
  'src/components/common/Button.tsx',
  'src/components/common/Input.tsx',
  'src/components/common/AIAssistantChat.tsx',
  'src/pages/DashboardPage.tsx',
];

// 递归获取所有 TSX 文件
function getAllTsxFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      getAllTsxFiles(filePath, fileList);
    } else if (file.endsWith('.tsx')) {
      fileList.push(filePath);
    }
  });
  
  return fileList;
}

function fixFile(filePath) {
  // 检查是否在排除列表中
  if (EXCLUDED_FILES.some(excluded => filePath.includes(excluded))) {
    console.log(`跳过已修复的文件: ${filePath}`);
    return;
  }
  
  const fullPath = path.join(__dirname, filePath);
  
  if (!fs.existsSync(fullPath)) {
    console.log(`文件不存在: ${filePath}`);
    return;
  }
  
  let content = fs.readFileSync(fullPath, 'utf8');
  let modified = false;
  
  // 替换缺少 dark: 样式类的样式
  Object.entries(COMMON_FIXES).forEach(([original, replacement]) => {
    // 使用更精确的正则表达式，避免匹配到已经包含 dark: 的部分
    const regex = new RegExp(`\\b${original.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}\\b(?!.*dark:)`, 'g');
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
  }
}

console.log('开始批量修复夜间模式样式...');

const srcDir = path.join(__dirname, 'src');
const tsxFiles = getAllTsxFiles(srcDir);

tsxFiles.forEach(filePath => {
  const relativePath = path.relative(__dirname, filePath);
  fixFile(relativePath);
});

console.log('批量修复完成！');
console.log(`已处理 ${tsxFiles.length} 个 TSX 文件`);