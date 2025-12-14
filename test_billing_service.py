#!/usr/bin/env python

import requests
import json

def test_billing_service_endpoints():
    """测试billingService使用的API端点"""

    token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tlbl90eXBlIjoiYWNjZXNzIiwiZXhwIjoxNzY1NTc4NTQ3LCJpYXQiOjE3NjU1NzQ5NDcsImp0aSI6ImM1MmJjOGE0MGU2ZTRlY2NhZDUzOWY0ZDUyOGQyODRhIiwidXNlcl9pZCI6IjcifQ.MJrK7M3Q0h3FAnE5MAwd4bqElr_8L4IVJm-Li5FFTF8"

    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
        "Origin": "http://localhost:3000",
        "Referer": "http://localhost:3000/settings"
    }

    print("🔍 测试billingService使用的API端点...")

    # 测试getDashboardStats()使用的API端点
    print("\n1. 测试getDashboardStats() - /billing/token-usage/dashboard_stats/")
    try:
        response = requests.get(
            "http://localhost:8000/api/billing/token-usage/dashboard_stats/",
            headers=headers,
            timeout=10
        )

        print(f"   状态码: {response.status_code}")
        print(f"   响应头: {dict(response.headers)}")

        if response.status_code == 200:
            data = response.json()
            print(f"   ✅ API调用成功")
            print(f"   响应数据: {json.dumps(data, indent=2, ensure_ascii=False)}")

            # 检查数据结构
            if 'user_stats' in data:
                user_stats = data['user_stats']
                print(f"   📊 用户统计:")
                print(f"      - 总tokens: {user_stats.get('total_tokens', 0)}")
                print(f"      - API调用次数: {user_stats.get('api_call_count', 0)}")
                print(f"      - 最后更新: {user_stats.get('last_updated', 'None')}")

                if user_stats.get('total_tokens', 0) > 0:
                    print(f"   ✅ 数据正确，应该显示在页面上")
                else:
                    print(f"   ❌ 数据为0，这就是前端显示0的原因")
            else:
                print(f"   ❌ 响应数据格式不正确，缺少user_stats字段")
        else:
            print(f"   ❌ API调用失败: {response.status_code}")
            print(f"   错误信息: {response.text}")

    except Exception as e:
        print(f"   ❌ API调用异常: {e}")

    # 测试getUserRecords()使用的API端点
    print("\n2. 测试getUserRecords() - /billing/token-usage/user_records/")
    try:
        response = requests.get(
            "http://localhost:8000/api/billing/token-usage/user_records/?limit=10",
            headers=headers,
            timeout=10
        )

        print(f"   状态码: {response.status_code}")

        if response.status_code == 200:
            data = response.json()
            print(f"   ✅ API调用成功")
            print(f"   记录数量: {len(data)}")

            if len(data) > 0:
                print(f"   最新记录: {data[0]}")
                print(f"   ✅ 有记录数据，应该显示在页面上")
            else:
                print(f"   ❌ 没有记录，这就是前端显示'暂无使用记录'的原因")
        else:
            print(f"   ❌ API调用失败: {response.status_code}")
            print(f"   错误信息: {response.text}")

    except Exception as e:
        print(f"   ❌ API调用异常: {e}")

    print("\n🔧 如果API返回正确的数据但前端显示0，请检查:")
    print("1. 前端是否正确解析API响应")
    print("2. 前端是否有错误处理逻辑返回了默认值")
    print("3. React组件状态是否正确更新")
    print("4. 是否有其他代码覆盖了正确的数据")

if __name__ == "__main__":
    test_billing_service_endpoints()