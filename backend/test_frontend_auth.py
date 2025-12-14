#!/usr/bin/env python
import os
import sys
import django

# 添加项目路径
sys.path.insert(0, '/Users/renqing/Downloads/scholaragent/backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')
django.setup()

from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import get_user_model

User = get_user_model()

def generate_frontend_tokens():
    """为前端生成有效的JWT tokens"""
    print("=" * 60)
    print("生成前端测试用的JWT Tokens")
    print("=" * 60)

    # 获取测试用户
    try:
        user = User.objects.get(username='alice_wang')
        print(f"✅ 用户: {user.display_name} (@{user.username})")
    except User.DoesNotExist:
        print("❌ 找不到测试用户")
        return

    # 生成 tokens
    refresh = RefreshToken.for_user(user)
    access_token = str(refresh.access_token)
    refresh_token = str(refresh)

    print(f"\n🔑 Access Token (复制到 localStorage access_token):")
    print(f"{access_token}")
    print(f"\n🔄 Refresh Token (复制到 localStorage refresh_token):")
    print(f"{refresh_token}")

    print(f"\n📝 在浏览器控制台中执行以下命令来设置token:")
    print(f"localStorage.setItem('access_token', '{access_token}')")
    print(f"localStorage.setItem('refresh_token', '{refresh_token}')")
    print(f"\n然后刷新页面并重新测试收藏功能。")

if __name__ == '__main__':
    generate_frontend_tokens()