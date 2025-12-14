#!/usr/bin/env python3
"""
启动 ScholarMind AI API 服务
"""
import os
import sys
import subprocess
from pathlib import Path

def check_dependencies():
    """检查并安装依赖"""
    requirements_file = Path(__file__).parent / "requirements.txt"
    if requirements_file.exists():
        print("正在检查依赖...")
        try:
            subprocess.run([sys.executable, "-m", "pip", "install", "-r", str(requirements_file)],
                         check=True, capture_output=True)
            print("依赖检查完成")
        except subprocess.CalledProcessError as e:
            print(f"依赖安装失败: {e}")
            return False
    return True

def main():
    """主函数"""
    # 检查环境变量
    if not os.getenv("DEEPSEEK_API_KEY"):
        print("⚠️  警告: 未设置 DEEPSEEK_API_KEY 环境变量")
        print("请设置 DeepSeek API 密钥以启用 AI 功能")
        print("可以创建 .env 文件并添加: DEEPSEEK_API_KEY=your_key_here")
        print()

    # 检查依赖
    if not check_dependencies():
        print("依赖安装失败，退出...")
        sys.exit(1)

    # 启动服务
    print("启动 ScholarMind AI API 服务...")
    print("API 地址: http://localhost:8000")
    print("文档地址: http://localhost:8000/docs")
    print()

    try:
        import uvicorn
        uvicorn.run("api_ai_chat:app", host="0.0.0.0", port=8000, reload=True)
    except KeyboardInterrupt:
        print("\n服务已停止")
    except Exception as e:
        print(f"启动失败: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()