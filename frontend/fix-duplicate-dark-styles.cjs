const fs = require('fs');
const path = require('path');

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

// 修复文件中的重复 dark 样式
function fixDuplicateDarkStyles(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  let modified = false;
  let newContent = content;

  // 修复重复的 dark: 前缀
  const patterns = [
    // 修复 dark:bg-gray-800 dark:bg-gray-900 -> dark:bg-gray-800
    /dark:bg-gray-800\s+dark:bg-gray-900/g,
    /dark:bg-gray-900\s+dark:bg-gray-800/g,

    // 修复 dark:text-gray-100 dark:text-gray-100 -> dark:text-gray-100
    /dark:text-gray-100\s+dark:text-gray-100/g,
    /dark:text-gray-900\s+dark:text-gray-100/g,

    // 修复 dark:border-gray-700 dark:border-gray-700 -> dark:border-gray-700
    /dark:border-gray-700\s+dark:border-gray-700/g,

    // 修复 dark:bg-gray-800 dark:bg-gray-800 -> dark:bg-gray-800
    /dark:bg-gray-800\s+dark:bg-gray-800/g,

    // 修复 dark:bg-gray-700 dark:bg-gray-700 -> dark:bg-gray-700
    /dark:bg-gray-700\s+dark:bg-gray-700/g,

    // 修复其他重复的 dark 样式
    /dark:text-gray-200\s+dark:text-gray-200/g,
    /dark:text-gray-300\s+dark:text-gray-300/g,
    /dark:border-gray-600\s+dark:border-gray-600/g,
  ];

  for (const pattern of patterns) {
    if (pattern.test(newContent)) {
      newContent = newContent.replace(pattern, (match) => {
        // 提取唯一的样式类
        const uniqueClasses = [...new Set(match.split(' '))].join(' ');
        return uniqueClasses;
      });
      modified = true;
    }
  }

  // 特殊修复：移除不必要的日间模式样式前的 dark: 前缀
  // 例如：dark:bg-gray-50 -> bg-gray-50
  const fixedPatterns = [
    {
      pattern: /dark:bg-gray-50/g,
      replacement: 'bg-gray-50'
    },
    {
      pattern: /dark:bg-gray-100/g,
      replacement: 'bg-gray-100'
    },
    {
      pattern: /dark:text-gray-900/g,
      replacement: 'text-gray-900'
    },
    {
      pattern: /dark:text-gray-800/g,
      replacement: 'text-gray-800'
    }
  ];

  for (const { pattern, replacement } of fixedPatterns) {
    if (pattern.test(newContent)) {
      // 只有当没有对应的 light 模式样式时才修复
      const lineMatches = newContent.match(/^.+$/gm);
      let hasModification = false;

      for (const line of lineMatches) {
        if (pattern.test(line)) {
          // 检查是否已经有对应的 light 模式样式
          const hasLightStyle = /bg-gray-50|bg-gray-100|text-gray-900|text-gray-800/.test(line) && !/dark:/.test(line);
          if (!hasLightStyle) {
            newContent = newContent.replace(line, line.replace(pattern, replacement));
            hasModification = true;
          }
        }
      }

      if (hasModification) {
        modified = true;
      }
    }
  }

  if (modified) {
    console.log(`✅ 修复了文件: ${filePath}`);
    fs.writeFileSync(filePath, newContent);
  }
}

// 主函数
function main() {
  console.log('🔧 开始修复重复的 dark 样式...\n');

  const srcDir = path.join(__dirname, 'src');

  walkDirectory(srcDir, (filePath) => {
    fixDuplicateDarkStyles(filePath);
  });

  console.log('\n✅ 修复完成！');
  console.log('\n📝 修复内容：');
  console.log('- 移除了重复的 dark: 前缀');
  console.log('- 修复了错误的 dark:bg-gray-50 等（应该是日间模式样式）');
  console.log('- 统一了 dark 样式的格式');
}

main();