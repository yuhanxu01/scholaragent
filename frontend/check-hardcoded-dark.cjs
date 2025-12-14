const fs = require('fs');
const path = require('path');

// 需要检查的硬编码深色样式
const hardcodedDarkPatterns = [
  'bg-gray-800',
  'bg-gray-900',
  'bg-gray-700',
  'bg-gray-600',
  'text-gray-100',
  'text-gray-200',
  'text-gray-300',
  'text-gray-400',
  'border-gray-700',
  'border-gray-600',
  'border-gray-800',
  'bg-slate-800',
  'bg-slate-900',
  'text-slate-100',
  'text-slate-200'
];

// 递归遍历目录
function walkDirectory(dir, callback) {
  const files = fs.readdirSync(dir);

  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      // 跳过 node_modules 和 dist 目录
      if (!['node_modules', 'dist', '.git'].includes(file)) {
        walkDirectory(filePath, callback);
      }
    } else if (file.match(/\.(ts|tsx|js|jsx)$/)) {
      callback(filePath);
    }
  }
}

// 检查文件中的硬编码深色样式
function checkHardcodedDarkStyles(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  let foundIssues = false;

  lines.forEach((line, index) => {
    // 只检查 className 属性中的内容
    const classNameMatch = line.match(/className=["']([^"']+)["']/);
    if (classNameMatch) {
      const classNameContent = classNameMatch[1];

      // 检查是否包含硬编码的深色样式
      for (const pattern of hardcodedDarkPatterns) {
        // 确保不是 dark: 前缀的
        const regex = new RegExp(`(?<!dark:)\\b${pattern}\\b`);
        if (regex.test(classNameContent)) {
          if (!foundIssues) {
            console.log(`\n📄 文件: ${filePath}`);
            foundIssues = true;
          }
          console.log(`  第 ${index + 1} 行: ${pattern}`);
          console.log(`    ${line.trim()}`);
        }
      }
    }
  });

  return foundIssues;
}

// 主函数
function main() {
  console.log('🔍 检查硬编码的深色样式...\n');

  const srcDir = path.join(__dirname, 'src');
  const filesWithIssues = [];

  walkDirectory(srcDir, (filePath) => {
    if (checkHardcodedDarkStyles(filePath)) {
      filesWithIssues.push(filePath);
    }
  });

  if (filesWithIssues.length === 0) {
    console.log('✅ 没有发现硬编码的深色样式！');
  } else {
    console.log('\n❌ 发现问题的文件数量:', filesWithIssues.length);
    console.log('\n📝 修复建议：');
    console.log('1. 将硬编码的深色样式改为日间模式样式');
    console.log('   - bg-gray-800 -> bg-white');
    console.log('   - bg-gray-900 -> bg-gray-50');
    console.log('   - text-gray-100 -> text-gray-900');
    console.log('   - text-gray-300 -> text-gray-600');
    console.log('2. 添加对应的 dark: 样式');
    console.log('   - bg-white dark:bg-gray-800');
    console.log('   - text-gray-900 dark:text-gray-100');
  }
}

main();