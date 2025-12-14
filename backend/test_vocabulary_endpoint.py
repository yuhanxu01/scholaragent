import os
import sys
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

django.setup()

from rest_framework.test import APIClient
from django.contrib.auth import get_user_model

User = get_user_model()

# Create a test user
user, created = User.objects.get_or_create(
    username='testuser',
    defaults={'email': 'test@example.com'}
)
if created:
    user.set_password('testpass123')
    user.save()

# Get token
from rest_framework_simplejwt.tokens import RefreshToken
refresh = RefreshToken.for_user(user)
access_token = str(refresh.access_token)

# Create API client
client = APIClient()
client.credentials(HTTP_AUTHORIZATION=f'Bearer {access_token}')

# Test POST to vocabulary endpoint with trailing slash
response = client.post('/api/study/vocabulary/', {
    'word': 'testword',
    'definition': 'A test definition',
    'category': 'test',
    'mastery_level': 1,
}, format='json')

print(f'Status Code: {response.status_code}')
print(f'Response: {response.data}')

if response.status_code == 201:
    print('SUCCESS: Vocabulary created with trailing slash')
else:
    print('FAILURE')

# Test POST without trailing slash (should fail with 500 if APPEND_SLASH is True)
response2 = client.post('/api/study/vocabulary', {
    'word': 'testword2',
    'definition': 'Another test',
    'category': 'test',
    'mastery_level': 1,
}, format='json')

print(f'Status Code (no slash): {response2.status_code}')
print(f'Response (no slash): {response2.data}')