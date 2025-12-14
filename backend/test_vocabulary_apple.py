import os
import sys
import django
import requests

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

django.setup()

from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import RefreshToken

User = get_user_model()

user = User.objects.get(username='testuser')
refresh = RefreshToken.for_user(user)
access_token = str(refresh.access_token)

print(f'Access token: {access_token[:20]}...')

# First check if apple exists in user's vocabulary
url = 'http://localhost:8000/api/study/vocabulary/'
headers = {'Authorization': f'Bearer {access_token}'}
params = {'search': 'apple'}
response = requests.get(url, headers=headers, params=params)
if response.status_code == 200:
    data = response.json()
    if isinstance(data, dict) and data.get('results'):
        print('Apple already exists in vocabulary')
        print(data['results'])
    else:
        print('Apple not found, proceeding to create')
        # Create with auto-fill
        create_url = 'http://localhost:8000/api/study/vocabulary/create/'
        data = {'word': 'apple'}
        response = requests.post(create_url, json=data, headers=headers)
        print(f'Create status: {response.status_code}')
        print(f'Response: {response.text}')
else:
    print(f'Error checking vocabulary: {response.status_code} {response.text}')