import os
import sys
import django
import requests
import uuid

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

# Generate a random word to avoid duplicates
random_word = f'testword_{uuid.uuid4().hex[:8]}'
print(f'Using word: {random_word}')

# Make POST request to create endpoint
url = 'http://localhost:8000/api/study/vocabulary/create/'
headers = {
    'Authorization': f'Bearer {access_token}',
    'Content-Type': 'application/json',
}
data = {'word': random_word}

response = requests.post(url, json=data, headers=headers)
print(f'Status: {response.status_code}')
if response.status_code == 201:
    print('Success! Response:')
    print(response.text)
else:
    print(f'Error: {response.text}')