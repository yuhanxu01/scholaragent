#!/bin/bash

# 测试夜间模式持久化功能
echo "🧪 测试夜间模式持久化功能..."

# 启动前端服务器（如果尚未运行）
echo "📦 启动前端服务器..."
cd frontend
npm run dev &
FRONTEND_PID=$!

# 等待服务器启动
sleep 5

echo ""
echo "✅ 测试步骤："
echo "1. 打开浏览器访问: http://localhost:5173"
echo "2. 登录账户"
echo "3. 切换到夜间模式"
echo "4. 刷新页面（F5）"
echo "5. 验证夜间模式是否保持"
echo ""
echo "🔍 打开浏览器开发者工具，在控制台查看以下信息："
echo "- 'main.tsx - Pre-render theme setup'"
echo "- 'ThemeProvider - Initial theme'"
echo "- 'HTML classes after applying'"
echo ""
echo "💾 检查 localStorage:"
echo "在控制台执行: localStorage.getItem('theme')"
echo ""
echo "📝 预期结果："
echo "- 页面刷新后主题应该保持不变"
echo "- localStorage 中应该保存了主题设置"
echo "- HTML 元素应该有正确的 'dark' 或 'light' class"
echo ""

# 清理函数
cleanup() {
    echo "🧹 清理进程..."
    kill $FRONTEND_PID 2>/dev/null
    exit 0
}

# 捕获退出信号
trap cleanup SIGINT SIGTERM

echo "按 Ctrl+C 停止测试..."
wait