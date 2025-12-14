#!/usr/bin/env python3
"""
测试学习小组和群聊功能
"""
import requests
import json
import time

BASE_URL = 'http://localhost:8000'

def test_group_chat():
    """测试学习小组和群聊功能"""
    print("🚀 开始测试学习小组和群聊功能...")

    # 登录获取token
    login_data = {
        'email': 'test@example.com',  # 使用测试用户
        'password': 'testpass123'
    }

    try:
        login_response = requests.post(f'{BASE_URL}/api/auth/login/', json=login_data)
        if login_response.status_code != 200:
            print("❌ 登录失败")
            return

        token_data = login_response.json()
        access_token = token_data.get('access')
        headers = {'Authorization': f'Bearer {access_token}'}

        print("✓ 成功获取认证令牌")

        # 测试创建学习小组
        print("\n📚 测试学习小组功能...")
        group_data = {
            'name': '测试学习小组',
            'description': '用于测试的学习小组',
            'subject': '编程',
            'privacy': 'private'
        }

        create_group_response = requests.post(
            f'{BASE_URL}/api/auth/groups/create/',
            json=group_data,
            headers=headers
        )

        if create_group_response.status_code == 201:
            group_data = create_group_response.json()
            group_id = group_data['group']['id']
            print(f"✓ 成功创建学习小组: {group_data['group']['name']}")

            # 测试获取小组列表
            groups_response = requests.get(f'{BASE_URL}/api/auth/groups/', headers=headers)
            if groups_response.status_code == 200:
                groups = groups_response.json()
                print(f"✓ 成功获取小组列表，共 {len(groups)} 个小组")

            # 测试获取小组详情
            group_detail_response = requests.get(f'{BASE_URL}/api/auth/groups/{group_id}/', headers=headers)
            if group_detail_response.status_code == 200:
                group_detail = group_detail_response.json()
                print(f"✓ 成功获取小组详情: {group_detail['name']}")

            # 测试获取小组频道
            channels_response = requests.get(f'{BASE_URL}/api/auth/groups/{group_id}/channels/', headers=headers)
            if channels_response.status_code == 200:
                channels = channels_response.json()
                print(f"✓ 成功获取频道列表，共 {len(channels)} 个频道")

                if channels:
                    channel = channels[0]
                    print(f"✓ 默认频道: {channel['name']}")

            # 测试获取小组成员
            members_response = requests.get(f'{BASE_URL}/api/auth/groups/{group_id}/members/', headers=headers)
            if members_response.status_code == 200:
                members = members_response.json()
                print(f"✓ 成功获取成员列表，共 {len(members)} 个成员")

        else:
            print(f"❌ 创建学习小组失败: {create_group_response.status_code} - {create_group_response.text}")

        print("\n✅ 学习小组和群聊功能测试完成!")

    except Exception as e:
        print(f"❌ 测试过程中出现错误: {str(e)}")

if __name__ == '__main__':
    test_group_chat()