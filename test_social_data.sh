#!/bin/bash

ACCESS_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tlbl90eXBlIjoiYWNjZXNzIiwiZXhwIjoxNzY1MzIzNzk5LCJpYXQiOjE3NjUzMjAxOTksImp0aSI6Ijc4MzYzNzBjZDI5NjRiYTM5MmZkZDE2YWI0YzQzNjkzIiwidXNlcl9pZCI6IjcifQ.-jSME6WPWwnhpQkcryrdMhwGKNwm3ppxpjK5ZVKqXa8"

echo "=== Testing document API with social data ==="
curl -H "Authorization: Bearer $ACCESS_TOKEN" \
  "http://localhost:8000/api/documents/?page_size=1" | jq '.results[0] | {id, title, likes_count, is_liked, collections_count, is_collected, comments_count}'

echo -e "\n=== Testing notes API with social data ==="
curl -H "Authorization: Bearer $ACCESS_TOKEN" \
  "http://localhost:8000/api/knowledge/notes/?page_size=1" | jq '.results[0] | {id, title, likes_count, is_liked}'