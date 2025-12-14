#!/bin/bash

echo "Testing dictionary lookup API with authentication..."

# First, let's see if we have any tokens stored
echo "Checking for existing tokens..."

# Try to get a token by logging in with test credentials
echo "Attempting to login..."
LOGIN_RESPONSE=$(curl -s -X POST "http://localhost:8000/api/auth/login/" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "alice@example.com",
    "password": "password123"
  }')

echo "Login response: $LOGIN_RESPONSE"

# Extract the access token
ACCESS_TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.access')

if [ "$ACCESS_TOKEN" != "null" ] && [ "$ACCESS_TOKEN" != "" ]; then
  echo "Access token obtained successfully"

  # Now test the dictionary lookup with the token
  echo -e "\nTesting dictionary lookup with authentication..."
  echo "Testing word 'hello':"
  curl -s -X GET "http://localhost:8000/api/study/dictionary/lookup/?word=hello" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $ACCESS_TOKEN" | jq .

  echo -e "\nTesting word 'Hello' (capitalized):"
  curl -s -X GET "http://localhost:8000/api/study/dictionary/lookup/?word=Hello" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $ACCESS_TOKEN" | jq .

  echo -e "\nTesting word 'HELLO' (uppercase):"
  curl -s -X GET "http://localhost:8000/api/study/dictionary/lookup/?word=HELLO" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $ACCESS_TOKEN" | jq .
else
  echo "Failed to get access token"
  echo "Response: $LOGIN_RESPONSE"
fi