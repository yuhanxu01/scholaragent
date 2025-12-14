#!/bin/bash

# API集成测试

# 先登录获取token
echo "Logging in..."
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:8000/api/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{
    "email": "alice_wang",
    "password": "password123"
  }')

TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.access')

if [ "$TOKEN" == "null" ]; then
  echo "Login failed!"
  exit 1
fi

echo "Login successful!"

# 测试查词API
echo -e "\n1. Testing dictionary lookup API..."
LOOKUP_RESPONSE=$(curl -s -X GET "http://localhost:8000/api/study/dictionary/lookup/?word=hello" \
  -H "Authorization: Bearer $TOKEN")

echo "Lookup response:"
echo $LOOKUP_RESPONSE | jq .

# 测试自动补全API
echo -e "\n2. Testing autocomplete API..."
AUTOCOMPLETE_RESPONSE=$(curl -s -X GET "http://localhost:8000/api/study/dictionary/autocomplete/?q=hel&limit=5" \
  -H "Authorization: Bearer $TOKEN")

echo "Autocomplete response:"
echo $AUTOCOMPLETE_RESPONSE | jq .

# 测试添加生词（应该自动获取释义）
echo -e "\n3. Testing vocabulary creation with auto-definition..."
ADD_RESPONSE=$(curl -s -X POST http://localhost:8000/api/study/vocabulary/create/ \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "word": "machine"
  }')

echo "Vocabulary creation response:"
echo $ADD_RESPONSE | jq .

# 检查是否有释义
HAS_DEFINITION=$(echo $ADD_RESPONSE | jq -r '.definition')
if [ "$HAS_DEFINITION" != "null" ] && [ "$HAS_DEFINITION" != "" ]; then
  echo "✓ SUCCESS: Vocabulary was created with definition!"
else
  echo "✗ FAILED: Vocabulary was created without definition"
fi