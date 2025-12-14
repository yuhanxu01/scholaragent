#!/usr/bin/env python
"""
测试用户名/邮箱登录功能
"""

import os
import sys
import django

# 添加项目路径
sys.path.insert(0, '/Users/renqing/Downloads/scholaragent/backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')
django.setup()

from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
import json

User = get_user_model()

def test_login():
    print("=" * 70)
    print("测试登录功能")
    print("=" * 70)

    # 获取测试用户信息
    test_users = [
        {'username': 'alice_wang', 'email': 'alice@example.com', 'password': 'password123'},
        {'username': 'bob_chen', 'email': 'bob@example.com', 'password': 'password123'},
    ]

    client = APIClient()
    client.defaults['HTTP_HOST'] = 'localhost'

    for user_info in test_users:
        username = user_info['username']
        email = user_info['email']
        password = user_info['password']

        print(f"\n测试用户: {username} ({email})")
        print("-" * 50)

        # 1. 测试用户名登录
        print("\n1. 使用用户名登录...")
        response = client.post('/api/auth/login/', {
            'email': username,  # 使用用户名
            'password': password
        })

        if response.status_code == 200:
            data = response.json()
            print(f"   ✅ 用户名登录成功!")
            print(f"   Access Token: {data.get('access', '')[:50]}...")
            print(f"   用户信息: {data.get('user', {}).get('username')} ({data.get('user', {}).get('email')})")
        else:
            print(f"   ❌ 用户名登录失败: {response.status_code}")
            print(f"   错误信息: {response.content.decode()}")

        # 2. 测试邮箱登录
        print("\n2. 使用邮箱登录...")
        response = client.post('/api/auth/login/', {
            'email': email,  # 使用邮箱
            'password': password
        })

        if response.status_code == 200:
            data = response.json()
            print(f"   ✅ 邮箱登录成功!")
            print(f"   Access Token: {data.get('access', '')[:50]}...")
            print(f"   用户信息: {data.get('user', {}).get('username')} ({data.get('user', {}).get('email')})")
        else:
            print(f"   ❌ 邮箱登录失败: {response.status_code}")
            print(f"   错误信息: {response.content.decode()}")

        # 3. 测试错误密码
        print("\n3. 测试错误密码...")
        response = client.post('/api/auth/login/', {
            'email': username,
            'password': 'wrong_password'
        })

        if response.status_code == 401:
            print(f"   ✅ 正确拒绝了错误密码")
        else:
            print(f"   ❌ 未正确处理错误密码: {response.status_code}")

    # 4. 测试不存在的用户
    print("\n\n4. 测试不存在的用户...")
    response = client.post('/api/auth/login/', {
        'email': 'nonexistent_user',
        'password': 'password123'
    })

    if response.status_code == 401:
        print(f"   ✅ 正确拒绝了不存在的用户")
    else:
        print(f"   ❌ 未正确处理不存在的用户: {response.status_code}")

if __name__ == '__main__':
    test_login()