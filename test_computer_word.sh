#!/bin/bash

# Test adding a new word 'computer'

# Login first
TOKEN=$(curl -s -X POST http://localhost:8000/api/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{
    "email": "alice_wang",
    "password": "password123"
  }' | jq -r '.access')

# Add new word
echo "Adding word 'computer'..."
RESPONSE=$(curl -s -X POST http://localhost:8000/api/study/vocabulary/create/ \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "word": "computer"
  }')

echo "Response:"
echo $RESPONSE | jq .

# Check if it has definition
HAS_DEFINITION=$(echo $RESPONSE | jq -r '.definition')
if [ "$HAS_DEFINITION" != "null" ] && [ "$HAS_DEFINITION" != "" ]; then
  echo "✓ SUCCESS: 'computer' was added with definition!"
else
  echo "✗ FAILED: 'computer' was added without definition"
fi