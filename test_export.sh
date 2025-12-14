#!/bin/bash

# 获取访问令牌
echo "Logging in..."
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:8000/api/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"username": "alice_wang", "password": "password123"}')

echo "Login response: $LOGIN_RESPONSE"

# 提取访问令牌
ACCESS_TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.data.access')

if [ "$ACCESS_TOKEN" == "null" ] || [ -z "$ACCESS_TOKEN" ]; then
  echo "Failed to get access token"
  exit 1
fi

echo "Access token: $ACCESS_TOKEN"

# 测试JSON导出
echo -e "\nTesting JSON export..."
curl -s -H "Authorization: Bearer $ACCESS_TOKEN" \
  "http://localhost:8000/api/study/vocabulary/export/?format=json" | head -20

# 测试CSV导出
echo -e "\n\nTesting CSV export..."
curl -s -H "Authorization: Bearer $ACCESS_TOKEN" \
  "http://localhost:8000/api/study/vocabulary/export/?format=csv" | head -5