#!/bin/bash

ACCESS_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tlbl90eXBlIjoiYWNjZXNzIiwiZXhwIjoxNzY1MzIzNzk5LCJpYXQiOjE3NjUzMjAxOTksImp0aSI6Ijc4MzYzNzBjZDI5NjRiYTM5MmZkZDE2YWI0YzQzNjkzIiwidXNlcl9pZCI6IjcifQ.-jSME6WPWwnhpQkcryrdMhwGKNwm3ppxpjK5ZVKqXa8"

echo "=== Testing Documents API ==="
echo "Checking document social data:"
curl -H "Authorization: Bearer $ACCESS_TOKEN" \
  "http://localhost:8000/api/documents/?page_size=1" | jq '.results[0] | {id, title, likes_count, is_liked, collections_count, is_collected, comments_count}'

echo -e "\n=== Testing Notes API ==="
echo "Checking note social data:"
curl -H "Authorization: Bearer $ACCESS_TOKEN" \
  "http://localhost:8000/api/knowledge/notes/?page_size=1" | jq '.results[0] | {id, title, likes_count, is_liked}'

echo -e "\n=== Testing Comments API ==="
echo "Checking comments for documents:"
curl -H "Authorization: Bearer $ACCESS_TOKEN" \
  "http://localhost:8000/api/users/comments/?document_id=test-doc-id&sort=newest" | jq '.results | length'

echo -e "\n=== Testing Like Document API ==="
echo "Liking a document:"
DOC_ID=$(curl -s -H "Authorization: Bearer $ACCESS_TOKEN" \
  "http://localhost:8000/api/documents/?page_size=1" | jq -r '.results[0].id')

curl -X POST -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"document_id\": \"$DOC_ID\", \"action\": \"like\"}" \
  "http://localhost:8000/api/users/like-document/" | jq .

echo -e "\n=== Testing Collections API ==="
echo "Checking user collections:"
curl -H "Authorization: Bearer $ACCESS_TOKEN" \
  "http://localhost:8000/api/users/collections/" | jq '.results | length'