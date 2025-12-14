#!/bin/bash

# Get a fresh auth token
echo "Getting auth token..."
TOKEN_RESPONSE=$(curl -s -X POST "http://localhost:8000/api/auth/login/" \
  -H "Content-Type: application/json" \
  -d '{"email": "alice@example.com", "password": "password123"}')

echo "Token response: $TOKEN_RESPONSE"

# Extract token
TOKEN=$(echo $TOKEN_RESPONSE | jq -r '.access')

if [ "$TOKEN" = "null" ] || [ -z "$TOKEN" ]; then
  echo "Failed to get token"
  exit 1
fi

echo "Testing document API endpoints..."

# Test all documents
echo -e "\n=== All Documents ==="
curl -s -H "Authorization: Bearer $TOKEN" \
  "http://localhost:8000/api/documents/?page_size=3" | jq '.data.results[].title'

# Test favorites
echo -e "\n=== Favorites ==="
curl -s -H "Authorization: Bearer $TOKEN" \
  "http://localhost:8000/api/documents/favorites/?page_size=3" | jq '.data.results[].title // "No favorites"'

# Test public
echo -e "\n=== Public ==="
curl -s -H "Authorization: Bearer $TOKEN" \
  "http://localhost:8000/api/documents/public/?page_size=3" | jq '.data.results[].title'

# Test private
echo -e "\n=== Private ==="
curl -s -H "Authorization: Bearer $TOKEN" \
  "http://localhost:8000/api/documents/?privacy=private&page_size=3" | jq '.data.results[].title // "No private documents"'