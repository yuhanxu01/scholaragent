import os
import sys
import django
import requests

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

django.setup()

from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import RefreshToken
from apps.study.models import Vocabulary

User = get_user_model()

# Get or create test user
user, created = User.objects.get_or_create(
    username='testuser',
    defaults={'email': 'test@example.com', 'first_name': 'Test', 'last_name': 'User'}
)
print(f'User: {user.username}, created: {created}')

# Create some test vocabulary if needed
vocab_count = Vocabulary.objects.filter(user=user).count()
print(f'Current vocabulary count: {vocab_count}')

if vocab_count == 0:
    # Create some test vocabulary
    vocabularies = [
        Vocabulary(user=user, word='hello', definition='你好', mastery_level=3, category='greetings'),
        Vocabulary(user=user, word='world', definition='世界', mastery_level=2, category='nouns'),
        Vocabulary(user=user, word='python', definition='蟒蛇; Python编程语言', mastery_level=4, category='technology'),
        Vocabulary(user=user, word='test', definition='测试', mastery_level=1, category='general'),
    ]
    Vocabulary.objects.bulk_create(vocabularies)
    print(f'Created {len(vocabularies)} test vocabularies')

# Generate access token
refresh = RefreshToken.for_user(user)
access_token = str(refresh.access_token)

print(f'Access token: {access_token[:20]}...')

# Test vocabulary list without search
url = 'http://localhost:8000/api/study/vocabulary/'
headers = {
    'Authorization': f'Bearer {access_token}',
}

print('Testing vocabulary list (no search):')
response = requests.get(url, headers=headers)
print(f'Status: {response.status_code}')

if response.status_code == 200:
    data = response.json()
    print(f'Total results: {data.get("count", "unknown")}')
    results = data.get('results', [])
    print(f'Returned {len(results)} items')
    if results:
        print(f'First item word: {results[0].get("word", "unknown")}')
else:
    print(f'Error: {response.text}')

# Test vocabulary search with search parameter
print('\nTesting vocabulary search (with search=hello):')
params = {'search': 'hello'}
response = requests.get(url, headers=headers, params=params)
print(f'Status: {response.status_code}')

if response.status_code == 200:
    data = response.json()
    print(f'Total results: {data.get("count", "unknown")}')
    results = data.get('results', [])
    print(f'Returned {len(results)} items')
    if results:
        print(f'First item word: {results[0].get("word", "unknown")}')
        print(f'First item definition: {results[0].get("definition", "unknown")}')
else:
    print(f'Error: {response.text}')

# Test vocabulary search with category filter
print('\nTesting vocabulary search (category=general):')
params = {'category': 'general'}
response = requests.get(url, headers=headers, params=params)
print(f'Status: {response.status_code}')

if response.status_code == 200:
    data = response.json()
    print(f'Total results: {data.get("count", "unknown")}')
    results = data.get('results', [])
    print(f'Returned {len(results)} items')
    if results:
        for item in results:
            print(f'  - {item.get("word", "unknown")}: {item.get("category", "unknown")}')
else:
    print(f'Error: {response.text}')

print('\nVocabulary search test completed!')
