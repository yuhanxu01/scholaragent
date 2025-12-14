#!/usr/bin/env python
import os
import sys
import django

# Setup Django
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.study.simple_dictionary import SimpleDictionary

def test_dictionary():
    dict_instance = SimpleDictionary()

    if dict_instance.load_dictionary():
        print("Dictionary loaded successfully!")
        print(f"Word count: {dict_instance.get_word_count()}")

        # Test lookup
        words = ['hello', 'computer', 'world', 'testword']
        for word in words:
            result = dict_instance.lookup_word(word)
            if result:
                print(f"\nLookup for '{word}':")
                print(f"  Definition: {result.get('definition', '')}")
                print(f"  Translation: {result.get('translation', '')}")
                print(f"  Pronunciation: {result.get('pronunciation', '')}")
            else:
                print(f"\nNo definition found for '{word}'")
    else:
        print("Failed to load dictionary")

if __name__ == '__main__':
    test_dictionary()