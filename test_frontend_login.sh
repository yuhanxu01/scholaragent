#!/bin/bash

echo "Testing admin login from frontend perspective..."
echo "============================================="

# Test 1: Login with email (admin@example.com)
echo -e "\n1. Testing login with email:"
curl -X POST http://localhost:8000/api/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@example.com", "password": "password123"}' \
  -s | jq -r '.user.username // "Failed"'

# Test 2: Login with username (admin)
echo -e "\n2. Testing login with username:"
curl -X POST http://localhost:8000/api/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"email": "admin", "password": "password123"}' \
  -s | jq -r '.user.username // "Failed"'

# Test 3: Check /auth/me/ endpoint with token
echo -e "\n3. Testing /auth/me/ endpoint after login:"
LOGIN_RESPONSE=$(curl -X POST http://localhost:8000/api/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"email": "admin", "password": "password123"}' \
  -s)

ACCESS_TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.access')

if [ "$ACCESS_TOKEN" != "null" ] && [ "$ACCESS_TOKEN" != "" ]; then
  curl -X GET http://localhost:8000/api/auth/me/ \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    -s | jq -r '.username // "Failed to get user"'
else
  echo "Login failed, cannot test /auth/me/ endpoint"
fi