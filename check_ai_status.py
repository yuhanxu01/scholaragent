#!/usr/bin/env python

import requests
import json

def check_ai_status():
    """检查AI助手配置状态"""

    # 你的token
    token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tlbl90eXBlIjoiYWNjZXNzIiwiZXhwIjoxNzY1NTc4NTQ3LCJpYXQiOjE3NjU1NzQ5NDcsImp0aSI6ImM1MmJjOGE0MGU2ZTRlY2NhZDUzOWY0ZDUyOGQyODRhIiwidXNlcl9pZCI6IjcifQ.MJrK7M3Q0h3FAnE5MAwd4bqElr_8L4IVJm-Li5FFTF8"

    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }

    print("🔍 检查AI助手状态...")

    # 测试AI助手
    test_message = {
        "message": "Hello, this is a test message",
        "context": {"pageType": "dashboard", "test": True}
    }

    try:
        response = requests.post(
            "http://localhost:8000/api/agent/chat/",
            headers=headers,
            json=test_message,
            timeout=10
        )

        if response.status_code == 200:
            result = response.json()
            print("✅ AI助手响应正常")
            print(f"📝 响应内容: {result.get('response', '')[:100]}...")

            # 检查token使用是否更新
            stats_response = requests.get(
                "http://localhost:8000/api/billing/token-usage/user_stats/",
                headers=headers
            )

            if stats_response.status_code == 200:
                stats = stats_response.json()
                print(f"📊 当前token统计:")
                print(f"   - 总输入: {stats['total_input_tokens']}")
                print(f"   - 总输出: {stats['total_output_tokens']}")
                print(f"   - 总计: {stats['total_tokens']}")
                print(f"   - API调用次数: {stats['api_call_count']}")
                print(f"   - 最后更新: {stats['last_updated']}")

                # 检查最新记录
                records_response = requests.get(
                    "http://localhost:8000/api/billing/token-usage/user_records/?limit=1",
                    headers=headers
                )

                if records_response.status_code == 200:
                    records = records_response.json()
                    if records:
                        latest = records[0]
                        print(f"📋 最新记录:")
                        print(f"   - API类型: {latest['api_type']}")
                        print(f"   - 输入token: {latest['input_tokens']}")
                        print(f"   - 输出token: {latest['output_tokens']}")
                        print(f"   - 总计token: {latest['total_tokens']}")
                        print(f"   - 创建时间: {latest['created_at']}")
                        print(f"   - 元数据: {latest.get('metadata', {})}")

                        # 检查是否是fallback响应
                        metadata = latest.get('metadata', {})
                        if metadata.get('fallback'):
                            print("⚠️  这是fallback响应，可能API key未配置")
                        else:
                            print("✅ 这是真实的API响应")
                    else:
                        print("❌ 没有找到token使用记录")
            else:
                print(f"❌ 获取token统计失败: {stats_response.status_code}")

        else:
            print(f"❌ AI助手响应失败: {response.status_code}")
            print(f"错误信息: {response.text}")

    except requests.exceptions.Timeout:
        print("⏰ AI助手响应超时，可能是网络问题或API配置错误")
    except Exception as e:
        print(f"❌ 检查AI助手状态时发生错误: {e}")

if __name__ == "__main__":
    check_ai_status()