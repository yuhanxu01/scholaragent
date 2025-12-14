#!/bin/bash

echo "Testing login error handling..."
echo "================================"

# Test 1: Wrong password
echo -e "\n1. Testing with wrong password:"
curl -X POST http://localhost:8000/api/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"email": "admin", "password": "wrongpassword"}' \
  -s | jq .

# Test 2: Non-existent user
echo -e "\n2. Testing with non-existent user:"
curl -X POST http://localhost:8000/api/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"email": "nonexistentuser", "password": "password123"}' \
  -s | jq .

# Test 3: Empty password
echo -e "\n3. Testing with empty password:"
curl -X POST http://localhost:8000/api/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"email": "admin", "password": ""}' \
  -s | jq .

# Test 4: Empty email/username
echo -e "\n4. Testing with empty email:"
curl -X POST http://localhost:8000/api/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"email": "", "password": "password123"}' \
  -s | jq .

# Test 5: Valid login (should succeed)
echo -e "\n5. Testing valid login:"
curl -X POST http://localhost:8000/api/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"email": "admin", "password": "password123"}' \
  -s | jq '.user.username'