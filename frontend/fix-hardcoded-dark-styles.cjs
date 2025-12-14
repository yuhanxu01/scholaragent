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

// 修复文件中的硬编码深色样式
function fixHardcodedDarkStyles(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  let modified = false;
  let newContent = content;

  // 需要修复的硬编码深色样式（这些应该是日间模式样式）
  const hardcodedDarkPatterns = [
    // 这些是深色，但在没有 dark: 前缀时会一直显示
    {
      pattern: /\bbg-gray-800\b/g,
      replacement: 'bg-white',
      condition: (line) => !line.includes('dark:') && !line.includes('className=') || line.includes('className="') && !line.includes('dark:')
    },
    {
      pattern: /\bbg-gray-900\b/g,
      replacement: 'bg-gray-50',
      condition: (line) => !line.includes('dark:') && !line.includes('className=') || line.includes('className="') && !line.includes('dark:')
    },
    {
      pattern: /\bbg-gray-700\b/g,
      replacement: 'bg-gray-100',
      condition: (line) => !line.includes('dark:') && !line.includes('className=') || line.includes('className="') && !line.includes('dark:')
    },
    {
      pattern: /\btext-gray-100\b/g,
      replacement: 'text-gray-900',
      condition: (line) => !line.includes('dark:') && !line.includes('className=') || line.includes('className="') && !line.includes('dark:')
    },
    {
      pattern: /\btext-gray-200\b/g,
      replacement: 'text-gray-800',
      condition: (line) => !line.includes('dark:') && !line.includes('className=') || line.includes('className="') && !line.includes('dark:')
    },
    {
      pattern: /\btext-gray-300\b/g,
      replacement: 'text-gray-600',
      condition: (line) => !line.includes('dark:') && !line.includes('className=') || line.includes('className="') && !line.includes('dark:')
    },
    // 边框颜色
    {
      pattern: /\bborder-gray-700\b/g,
      replacement: 'border-gray-200',
      condition: (line) => !line.includes('dark:') && !line.includes('className=') || line.includes('className="') && !line.includes('dark:')
    },
    {
      pattern: /\bborder-gray-600\b/g,
      replacement: 'border-gray-300',
      condition: (line) => !line.includes('dark:') && !line.includes('className=') || line.includes('className="') && !line.includes('dark:')
    }
  ];

  // 按行处理，以便更精确地控制
  const lines = newContent.split('\n');
  const newLines = lines.map(line => {
    let newLine = line;

    // 只处理 className 属性中的内容
    const classNameMatch = line.match(/className=["']([^"']+)["']/);
    if (classNameMatch) {
      const classNameContent = classNameMatch[1];
      let newClassNameContent = classNameContent;

      for (const { pattern, replacement, condition } of hardcodedDarkPatterns) {
        if (pattern.test(newClassNameContent) && condition(line)) {
          newClassNameContent = newClassNameContent.replace(pattern, replacement);
        }
      }

      if (newClassNameContent !== classNameContent) {
        newLine = line.replace(classNameMatch[0], `className="${newClassNameContent}"`);
        modified = true;
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
  console.log('🔧 开始修复硬编码的深色样式...\n');

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
  console.log('\n📝 修复内容：');
  console.log('- bg-gray-800 -> bg-white （在没有 dark: 前缀时）');
  console.log('- bg-gray-900 -> bg-gray-50 （在没有 dark: 前缀时）');
  console.log('- bg-gray-700 -> bg-gray-100 （在没有 dark: 前缀时）');
  console.log('- text-gray-100 -> text-gray-900 （在没有 dark: 前缀时）');
  console.log('- text-gray-200 -> text-gray-800 （在没有 dark: 前缀时）');
  console.log('- text-gray-300 -> text-gray-600 （在没有 dark: 前缀时）');
  console.log('- border-gray-700 -> border-gray-200 （在没有 dark: 前缀时）');
  console.log('- border-gray-600 -> border-gray-300 （在没有 dark: 前缀时）');
  console.log('\n⚠️  请注意：只修改了没有 dark: 前缀的样式，保留了正确的夜间模式样式。');
}

main();