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

# Make POST request with same word
url = 'http://localhost:8000/api/study/vocabulary/'
headers = {
    'Authorization': f'Bearer {access_token}',
    'Content-Type': 'application/json',
}
data = {'word': 'testword'}

response = requests.post(url, json=data, headers=headers)
print(f'Status: {response.status_code}')
print(f'Response: {response.text}')