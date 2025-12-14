#!/usr/bin/env python

import os
import sys
import django

# Add the backend directory to the Python path
sys.path.insert(0, '/Users/renqing/Downloads/scholaragent/backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

# Setup Django
django.setup()

from apps.billing.models import UserTokenUsage, TokenUsageRecord
from apps.users.models import User
from django.contrib.auth import get_user_model

def check_token_usage():
    print('=== Current Token Usage Records ===')
    try:
        User = get_user_model()
        user = User.objects.first()
        if user:
            print(f'User: {user.username} (ID: {user.id})')
            token_usage = UserTokenUsage.objects.filter(user=user).first()
            if token_usage:
                print(f'Total tokens: {token_usage.total_tokens}')
                print(f'Input tokens: {token_usage.total_input_tokens}')
                print(f'Output tokens: {token_usage.total_output_tokens}')
                print(f'API calls: {token_usage.api_call_count}')
            else:
                print('No token usage record found for this user')
        else:
            print('No users found')
    except Exception as e:
        print(f'Error: {e}')

    print('\n=== Token Usage Records ===')
    try:
        records = TokenUsageRecord.objects.all()[:10]
        for record in records:
            print(f'User: {record.user.username}, Type: {record.api_type}, Tokens: {record.total_tokens}')
        if not records:
            print('No token usage records found')
    except Exception as e:
        print(f'Error: {e}')

    print('\n=== Test Token Usage Recording ===')
    try:
        from apps.billing.services import TokenUsageService
        User = get_user_model()
        user = User.objects.first()
        if user:
            print(f'Testing token usage recording for user: {user.username}')
            record = TokenUsageService.record_token_usage(
                user=user,
                input_tokens=10,
                output_tokens=20,
                api_type='other',
                metadata={'test': True}
            )
            print(f'Created record: {record.id}, tokens: {record.total_tokens}')

            # Check updated stats
            token_usage = UserTokenUsage.objects.filter(user=user).first()
            if token_usage:
                print(f'Updated total tokens: {token_usage.total_tokens}')
        else:
            print('No users found to test with')
    except Exception as e:
        print(f'Error testing token usage: {e}')

if __name__ == '__main__':
    check_token_usage()