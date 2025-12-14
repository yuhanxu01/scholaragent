#!/bin/bash

# 测试日间模式显示效果
echo "🌞 测试日间模式显示效果..."

# 启动前端服务器
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
echo "3. 确保当前是日间模式（点击太阳图标）"
echo "4. 检查以下页面的显示效果："
echo ""
echo "📋 需要检查的页面："
echo "- Dashboard (/dashboard)"
echo "- Documents (/documents)"
echo "- Chat (/chat)"
echo "- Reader (/reader)"
echo "- Settings (/settings)"
echo "- Profile (/user/[your_username])"
echo ""
echo "🔍 检查要点："
echo "- 背景应该是白色或浅色"
echo "- 文字应该是深色"
echo "- 没有黑色的背景或灰色的文字"
echo ""
echo "🐛 如果发现问题："
echo "1. 打开浏览器开发者工具"
echo "2. 检查元素的 className 属性"
echo "3. 查看是否有硬编码的深色样式（如 bg-gray-800、text-gray-100）"
echo "4. 确认没有多余的 dark: 前缀"
echo ""
echo "💡 预期的日间模式样式："
echo "- 卡片背景: bg-white"
echo "- 页面背景: bg-gray-50"
echo "- 主标题: text-gray-900"
echo "- 副标题: text-gray-600"
echo "- 边框: border-gray-200"
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