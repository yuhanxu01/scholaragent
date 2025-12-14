#!/bin/bash

# 测试不同的登录方式
echo "Testing login with username..."
curl -s -X POST http://localhost:8000/api/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"username": "alice_wang", "password": "password123"}'

echo -e "\n\nTesting login with email..."
curl -s -X POST http://localhost:8000/api/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"email": "alice@example.com", "password": "password123"}'

echo -e "\n\nTesting login with both..."
curl -s -X POST http://localhost:8000/api/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"username": "alice_wang", "email": "alice@example.com", "password": "password123"}'