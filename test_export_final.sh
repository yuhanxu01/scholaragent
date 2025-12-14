#!/bin/bash

# 获取新的访问令牌
echo "Getting fresh access token..."
ACCESS_TOKEN=$(curl -s -X POST http://localhost:8000/api/auth/login/ \
  -H "Content-Type: application/json" \
  -d "{\"email\": \"alice@example.com\", \"password\": \"password123\"}" | jq -r '.access')

echo "Token: $ACCESS_TOKEN"

# 测试JSON导出
echo -e "\n=== Testing JSON export ==="
curl -s -H "Authorization: Bearer $ACCESS_TOKEN" \
  "http://localhost:8000/api/study/vocabulary/export/?format=json" | jq '.[0].word' 2>/dev/null || echo "JSON export failed"

# 测试CSV导出
echo -e "\n=== Testing CSV export ==="
curl -s -H "Authorization: Bearer $ACCESS_TOKEN" \
  "http://localhost:8000/api/study/vocabulary/export/?format=csv" | head -3 || echo "CSV export failed"

# 测试无效格式
echo -e "\n=== Testing invalid format ==="
curl -s -H "Authorization: Bearer $ACCESS_TOKEN" \
  "http://localhost:8000/api/study/vocabulary/export/?format=xml" | jq '.error' 2>/dev/null || echo "Invalid format test failed"