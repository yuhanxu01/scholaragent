#!/usr/bin/env python

import requests
import json

def test_frontend_api_calls():
    """测试前端API调用，模拟浏览器请求"""

    # 使用你的token
    token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tlbl90eXBlIjoiYWNjZXNzIiwiZXhwIjoxNzY1NTc4NTQ3LCJpYXQiOjE3NjU1NzQ5NDcsImp0aSI6ImM1MmJjOGE0MGU2ZTRlY2NhZDUzOWY0ZDUyOGQyODRhIiwidXNlcl9pZCI6IjcifQ.MJrK7M3Q0h3FAnE5MAwd4bqElr_8L4IVJm-Li5FFTF8"

    # 模拟前端的请求头
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
        "Origin": "http://localhost:3000",
        "Referer": "http://localhost:3000/"
    }

    print("🔍 测试前端API调用...")

    # 测试用户token统计API
    print("\n1. 测试用户token统计API...")
    try:
        response = requests.get(
            "http://localhost:8000/api/billing/token-usage/user_stats/",
            headers=headers,
            timeout=10
        )

        print(f"   状态码: {response.status_code}")
        print(f"   响应头: {dict(response.headers)}")
        print(f"   响应数据: {json.dumps(response.json(), indent=2)}")

        if response.status_code == 200:
            data = response.json()
            if data.get('total_tokens', 0) > 0:
                print("   ✅ API返回了正确的token数据")
            else:
                print("   ❌ API返回的token数据为0")
        else:
            print(f"   ❌ API调用失败: {response.text}")

    except Exception as e:
        print(f"   ❌ API调用异常: {e}")

    # 测试用户记录API
    print("\n2. 测试用户记录API...")
    try:
        response = requests.get(
            "http://localhost:8000/api/billing/token-usage/user_records/",
            headers=headers,
            timeout=10
        )

        print(f"   状态码: {response.status_code}")
        print(f"   响应数据: {json.dumps(response.json(), indent=2)}")

        if response.status_code == 200:
            data = response.json()
            if len(data) > 0:
                print(f"   ✅ 找到 {len(data)} 条记录")
                latest = data[0]
                print(f"   最新记录: {latest}")
            else:
                print("   ❌ 没有找到记录")

    except Exception as e:
        print(f"   ❌ API调用异常: {e}")

    # 测试仪表板统计API
    print("\n3. 测试仪表板统计API...")
    try:
        response = requests.get(
            "http://localhost:8000/api/billing/token-usage/dashboard_stats/",
            headers=headers,
            timeout=10
        )

        print(f"   状态码: {response.status_code}")
        print(f"   响应数据: {json.dumps(response.json(), indent=2)}")

        if response.status_code == 200:
            data = response.json()
            user_stats = data.get('user_stats', {})
            if user_stats.get('total_tokens', 0) > 0:
                print("   ✅ 仪表板API返回了正确的token数据")
            else:
                print("   ❌ 仪表板API返回的token数据为0")

    except Exception as e:
        print(f"   ❌ API调用异常: {e}")

    print("\n🔧 建议检查以下项目:")
    print("1. 浏览器开发者工具的网络面板，查看实际的API请求")
    print("2. 浏览器控制台是否有错误信息")
    print("3. 前端代码中是否正确处理API响应")
    print("4. 前端是否有本地存储或状态管理缓存")
    print("5. 前端页面是否正确渲染token统计数据")

if __name__ == "__main__":
    test_frontend_api_calls()