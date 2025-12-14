#!/usr/bin/env node

/**
 * 夜间模式样式审计脚本
 * 扫描所有 React 组件，查找缺少 dark: 样式的元素
 */

const fs = require('fs');
const path = require('path');

// 需要检查的样式类模式
const LIGHT_PATTERNS = [
  /bg-white(?!\s+dark:)/g,
  /bg-gray-50(?!\s+dark:)/g,
  /bg-gray-100(?!\s+dark:)/g,
  /bg-gray-200(?!\s+dark:)/g,
  /text-gray-900(?!\s+dark:)/g,
  /text-gray-800(?!\s+dark:)/g,
  /text-gray-700(?!\s+dark:)/g,
  /text-gray-600(?!\s+dark:)/g,
  /border-gray-200(?!\s+dark:)/g,
  /border-gray-300(?!\s+dark:)/g,
];

const PATTERN_NAMES = [
  'bg-white',
  'bg-gray-50',
  'bg-gray-100',
  'bg-gray-200',
  'text-gray-900',
  'text-gray-800',
  'text-gray-700',
  'text-gray-600',
  'border-gray-200',
  'border-gray-300',
];

const results = {
  totalFiles: 0,
  filesWithIssues: 0,
  totalIssues: 0,
  issuesByFile: {},
};

function scanDirectory(dir) {
  const files = fs.readdirSync(dir);

  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      // 跳过 node_modules 和其他不需要的目录
      if (file === 'node_modules' || file === 'dist' || file === 'build' || file === '.git') {
        continue;
      }
      scanDirectory(filePath);
    } else if (file.endsWith('.tsx') || file.endsWith('.jsx')) {
      scanFile(filePath);
    }
  }
}

function scanFile(filePath) {
  results.totalFiles++;
  const content = fs.readFileSync(filePath, 'utf-8');
  const issues = [];

  // 查找 className 属性
  const classNameRegex = /className=["'{]([^"'}]+)["'}]/g;
  let match;

  while ((match = classNameRegex.exec(content)) !== null) {
    const className = match[1];
    const lineNumber = content.substring(0, match.index).split('\n').length;

    // 检查每个模式
    for (let i = 0; i < LIGHT_PATTERNS.length; i++) {
      if (LIGHT_PATTERNS[i].test(className)) {
        issues.push({
          line: lineNumber,
          pattern: PATTERN_NAMES[i],
          className: className.substring(0, 100), // 限制长度
        });
      }
    }
  }

  if (issues.length > 0) {
    results.filesWithIssues++;
    results.totalIssues += issues.length;
    results.issuesByFile[filePath] = issues;
  }
}

// 执行扫描
console.log('开始扫描 React 组件中缺少 dark: 样式的问题...\n');
const srcDir = path.join(__dirname, 'src');
scanDirectory(srcDir);

// 输出结果
console.log('='.repeat(80));
console.log('审计结果汇总');
console.log('='.repeat(80));
console.log(`总文件数: ${results.totalFiles}`);
console.log(`有问题的文件数: ${results.filesWithIssues}`);
console.log(`总问题数: ${results.totalIssues}`);
console.log('');

if (results.filesWithIssues > 0) {
  console.log('详细问题列表:');
  console.log('-'.repeat(80));

  // 按文件分组显示
  const sortedFiles = Object.keys(results.issuesByFile).sort();
  for (const file of sortedFiles) {
    const issues = results.issuesByFile[file];
    const relativePath = path.relative(srcDir, file);
    
    console.log(`\n📄 ${relativePath} (${issues.length} 个问题)`);
    
    // 按行号分组显示同一行的问题
    const issuesByLine = {};
    for (const issue of issues) {
      if (!issuesByLine[issue.line]) {
        issuesByLine[issue.line] = [];
      }
      issuesByLine[issue.line].push(issue.pattern);
    }

    for (const [line, patterns] of Object.entries(issuesByLine)) {
      console.log(`   第 ${line} 行: ${patterns.join(', ')}`);
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log('建议: 为以上样式类添加对应的 dark: 前缀样式');
  console.log('例如: bg-white 应该改为 bg-white dark:bg-gray-800');
  console.log('='.repeat(80));
} else {
  console.log('✅ 太棒了！没有发现问题。');
}

// 保存 JSON 报告
const reportPath = path.join(__dirname, 'dark-mode-audit-report.json');
fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
console.log(`\n详细报告已保存到: ${reportPath}`);
