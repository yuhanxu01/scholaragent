#!/usr/bin/env python
import os
import sys
import django

# Setup Django
sys.path.insert(0, '/Users/renqing/Downloads/scholaragent/backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')
django.setup()

from apps.study.vocabulary_views import get_dictionary_instance

# Test dictionary loading
print("Testing dictionary loading...")
dict_instance = get_dictionary_instance()

if dict_instance:
    print("✓ Dictionary loaded successfully!")
    info = dict_instance.get_info()
    print(f"Dictionary info: {info}")

    # Test lookup
    result = dict_instance.lookup_word('hello')
    if result:
        print(f"✓ Found 'hello': {result.get('word')} - {result.get('definition', '')[:100]}...")
    else:
        print("✗ 'hello' not found")

    # Test search
    results = dict_instance.search_words('dow', 5)
    print(f"✓ Search for 'dow' found {len(results)} results:")
    for r in results[:3]:
        if isinstance(r, dict):
            print(f"  - {r.get('word')}: {r.get('definition', '')[:50]}...")
        else:
            print(f"  - {r}")
else:
    print("✗ Failed to load dictionary")