const fs = require('fs');
const path = require('path');

// 递归遍历目录
function walkDirectory(dir, callback) {
  const files = fs.readdirSync(dir);

  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      if (!['node_modules', 'dist', '.git', 'pages/dark', 'pages/light'].includes(file)) {
        walkDirectory(filePath, callback);
      }
    } else if (file.match(/\.(ts|tsx|js|jsx)$/)) {
      callback(filePath);
    }
  }
}

// 修复文件中的硬编码深色样式
function fixHardcodedDarkStyles(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  let modified = false;
  let newContent = content;

  // 按行处理
  const lines = newContent.split('\n');
  const newLines = lines.map(line => {
    let newLine = line;

    // 只处理 className 属性中的内容
    const classNameMatch = line.match(/className=["']([^"']+)["']/);
    if (classNameMatch) {
      const originalClassName = classNameMatch[1];
      let newClassName = originalClassName;

      // 修复规则：只修改没有对应 dark: 前缀的样式
      const fixes = [
        // 灰色文字
        {
          pattern: /\btext-gray-400\b(?!.*dark:)/g,
          replacement: 'text-gray-500',
          comment: 'text-gray-400 -> text-gray-500 (更适合日间模式)'
        },
        {
          pattern: /\btext-gray-300\b(?!.*dark:)/g,
          replacement: 'text-gray-600',
          comment: 'text-gray-300 -> text-gray-600 (更适合日间模式)'
        },

        // 背景颜色
        {
          pattern: /\bhover:bg-gray-600\b(?!.*dark:)/g,
          replacement: 'hover:bg-gray-100',
          comment: 'hover:bg-gray-600 -> hover:bg-gray-100'
        },
        {
          pattern: /\bbg-gray-600\b(?!.*dark:)/g,
          replacement: 'bg-gray-200',
          comment: 'bg-gray-600 -> bg-gray-200'
        },

        // 图标颜色（通常用于辅助信息）
        {
          pattern: /\btext-gray-400\s+dark:text-gray-500/g,
          replacement: 'text-gray-500 dark:text-gray-400',
          comment: '调整日间/夜间模式的图标颜色对比'
        },

        // 清理重复的 dark: 样式
        {
          pattern: /dark:text-gray-400\s+dark:text-gray-500/g,
          replacement: 'dark:text-gray-400',
          comment: '移除重复的 dark: 样式'
        },
        {
          pattern: /dark:bg-gray-700\s+dark:text-gray-200/g,
          replacement: 'dark:bg-gray-700 dark:text-gray-300',
          comment: '调整夜间模式的对比度'
        }
      ];

      for (const fix of fixes) {
        if (fix.pattern.test(newClassName)) {
          newClassName = newClassName.replace(fix.pattern, fix.replacement);
          modified = true;
        }
      }

      if (newClassName !== originalClassName) {
        newLine = line.replace(classNameMatch[0], `className="${newClassName}"`);
      }
    }

    return newLine;
  });

  newContent = newLines.join('\n');

  if (modified) {
    console.log(`✅ 修复了文件: ${filePath}`);
    fs.writeFileSync(filePath, newContent);
  }
}

// 主函数
function main() {
  console.log('🔧 最终修复硬编码的深色样式...\n');

  const srcDir = path.join(__dirname, 'src');
  let totalFixed = 0;

  walkDirectory(srcDir, (filePath) => {
    const originalContent = fs.readFileSync(filePath, 'utf8');
    fixHardcodedDarkStyles(filePath);
    const newContent = fs.readFileSync(filePath, 'utf8');

    if (originalContent !== newContent) {
      totalFixed++;
    }
  });

  console.log(`\n✅ 修复完成！总共修复了 ${totalFixed} 个文件。`);
  console.log('\n📝 主要修复内容：');
  console.log('- text-gray-400 -> text-gray-500 (提高日间模式下的可读性)');
  console.log('- text-gray-300 -> text-gray-600 (提高日间模式下的可读性)');
  console.log('- hover:bg-gray-600 -> hover:bg-gray-100 (日间模式的悬停效果)');
  console.log('- bg-gray-600 -> bg-gray-200 (日间模式的背景色)');
  console.log('- 清理了重复的 dark: 样式');
  console.log('- 调整了日间/夜间模式的颜色对比度');
  console.log('\n💡 现在日间模式应该有更好的可读性和对比度了！');
}

main();