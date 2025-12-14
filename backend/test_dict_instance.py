#!/usr/bin/env python
import os
import sys
import django

# Setup Django
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.study.vocabulary_views import get_dictionary_instance

def test_dict_instance():
    print("Testing dictionary instance...")
    dict_instance = get_dictionary_instance()

    if dict_instance:
        print(f"Dictionary instance created: {type(dict_instance)}")
        print(f"Dictionary info: {dict_instance.get_info()}")

        # Test lookup
        result = dict_instance.lookup_word("hello")
        if result:
            print(f"\nLookup for 'hello':")
            print(f"  Definition: {result.get('definition', '')}")
            print(f"  Translation: {result.get('translation', '')}")
        else:
            print("No definition found for 'hello'")
    else:
        print("Failed to create dictionary instance")

if __name__ == '__main__':
    test_dict_instance()