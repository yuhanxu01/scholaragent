"""
测试好友和聊天功能
"""

import os
import sys
import django
import requests

# 设置Django环境
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')
django.setup()

from django.contrib.auth import get_user_model
from apps.users.models import Friend, ChatConversation, ChatMessage, ChatParticipant

User = get_user_model()

def get_auth_token():
    """获取认证令牌"""
    login_url = 'http://localhost:8000/api/auth/login/'
    login_data = {
        'email': 'test@example.com',
        'password': 'testpass123'
    }

    try:
        response = requests.post(login_url, json=login_data)
        if response.status_code == 200:
            return response.json()['access']
        else:
            print(f"登录失败: {response.status_code} - {response.text}")
            return None
    except Exception as e:
        print(f"登录请求失败: {e}")
        return None

def test_friend_system(token):
    """测试好友系统"""
    print("🧑‍🤝‍🧑 测试好友系统...")

    headers = {'Authorization': f'Bearer {token}'}

    # 创建测试用户
    test_user_data = {
        'username': 'testfriend',
        'email': 'testfriend@example.com',
        'password': 'testpass123',
        'first_name': 'Test',
        'last_name': 'Friend'
    }

    # 先注册测试用户
    register_url = 'http://localhost:8000/api/auth/register/'
    try:
        register_response = requests.post(register_url, json=test_user_data)
        if register_response.status_code == 201:
            print("✓ 创建测试用户成功")
        else:
            print(f"创建测试用户失败: {register_response.status_code}")
    except Exception as e:
        print(f"注册请求失败: {e}")

    # 发送好友请求
    friend_request_url = 'http://localhost:8000/api/auth/friends/request/'
    request_data = {'user_identifier': 'alice_wang'}  # 使用用户名

    try:
        response = requests.post(friend_request_url, json=request_data, headers=headers)
        if response.status_code == 200:
            print("✓ 发送好友请求成功")
        else:
            print(f"发送好友请求失败: {response.status_code} - {response.text}")
    except Exception as e:
        print(f"好友请求失败: {e}")

    # 获取好友列表
    friends_url = 'http://localhost:8000/api/auth/friends/'
    try:
        response = requests.get(friends_url, headers=headers)
        if response.status_code == 200:
            friends = response.json()
            print(f"✓ 获取好友列表成功，共 {len(friends)} 个好友")
        else:
            print(f"获取好友列表失败: {response.status_code}")
    except Exception as e:
        print(f"获取好友列表失败: {e}")

def test_chat_system(token):
    """测试聊天系统"""
    print("💬 测试聊天系统...")

    headers = {'Authorization': f'Bearer {token}'}

    # 创建聊天会话
    create_chat_url = 'http://localhost:8000/api/auth/chat/conversations/create/'
    chat_data = {
        'type': 'private',
        'participant_ids': [1, 2]  # 当前用户和另一个用户
    }

    try:
        response = requests.post(create_chat_url, json=chat_data, headers=headers)
        if response.status_code == 200:
            chat_data = response.json()
            conversation_id = chat_data['conversation']['id']
            print(f"✓ 创建聊天会话成功，ID: {conversation_id}")

            # 发送消息
            send_message_url = 'http://localhost:8000/api/auth/chat/messages/'
            message_data = {
                'conversation': conversation_id,
                'message_type': 'text',
                'content': '你好！这是测试消息。'
            }

            message_response = requests.post(send_message_url, json=message_data, headers=headers)
            if message_response.status_code == 200:
                print("✓ 发送消息成功")
            else:
                print(f"发送消息失败: {message_response.status_code} - {message_response.text}")

            # 获取消息列表
            messages_url = f'http://localhost:8000/api/auth/chat/conversations/{conversation_id}/messages/'
            messages_response = requests.get(messages_url, headers=headers)
            if messages_response.status_code == 200:
                messages = messages_response.json()
                print(f"✓ 获取消息列表成功，共 {len(messages)} 条消息")
            else:
                print(f"获取消息列表失败: {messages_response.status_code}")

        else:
            print(f"创建聊天会话失败: {response.status_code} - {response.text}")
    except Exception as e:
        print(f"聊天测试失败: {e}")

def main():
    """主测试函数"""
    print("🚀 开始测试好友和聊天功能...")

    # 获取认证令牌
    token = get_auth_token()
    if not token:
        print("❌ 无法获取认证令牌，测试终止")
        return

    print("✓ 成功获取认证令牌")

    # 测试好友系统
    test_friend_system(token)

    # 测试聊天系统
    test_chat_system(token)

    print("✅ 好友和聊天功能测试完成!")

if __name__ == '__main__':
    main()