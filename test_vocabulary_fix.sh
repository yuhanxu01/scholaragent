#!/bin/bash

# Test script for vocabulary definition auto-update feature

# First login to get access token
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
  echo $LOGIN_RESPONSE
  exit 1
fi

echo "Login successful! Token received."

# Test 1: Add a new word without definition
echo -e "\nTest 1: Adding a new word 'testword'..."
ADD_RESPONSE=$(curl -s -X POST http://localhost:8000/api/study/vocabulary/create/ \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "word": "testword"
  }')

echo "Response:"
echo $ADD_RESPONSE | jq .

# Get the word ID
WORD_ID=$(echo $ADD_RESPONSE | jq -r '.id')
echo "Word ID: $WORD_ID"

# Wait a moment for async task to potentially update
echo -e "\nWaiting 3 seconds for async update..."
sleep 3

# Check if the word has been updated
echo -e "\nTest 2: Checking if the word definition was updated..."
CHECK_RESPONSE=$(curl -s -X GET http://localhost:8000/api/study/vocabulary/$WORD_ID/ \
  -H "Authorization: Bearer $TOKEN")

echo "Updated word:"
echo $CHECK_RESPONSE | jq .

# Test 3: Batch create multiple words
echo -e "\nTest 3: Batch creating multiple words..."
BATCH_RESPONSE=$(curl -s -X POST http://localhost:8000/api/study/vocabulary/batch-create/ \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "words": [
      {"word": "example1"},
      {"word": "example2", "context": "This is a test context"},
      {"word": "pseudonym"}
    ]
  }')

echo "Batch create response:"
echo $BATCH_RESPONSE | jq .

# Test 4: Manual trigger for updating missing definitions
echo -e "\nTest 4: Manually triggering update for missing definitions..."
UPDATE_RESPONSE=$(curl -s -X POST http://localhost:8000/api/study/vocabulary/update-missing-definitions/ \
  -H "Authorization: Bearer $TOKEN")

echo "Update missing definitions response:"
echo $UPDATE_RESPONSE | jq .

# Test 5: Get vocabulary list to see which words are missing definitions
echo -e "\nTest 5: Getting vocabulary list..."
LIST_RESPONSE=$(curl -s -X GET "http://localhost:8000/api/study/vocabulary/?page_size=10" \
  -H "Authorization: Bearer $TOKEN")

echo "Vocabulary list:"
echo $LIST_RESPONSE | jq '.results[] | {word: .word, definition: .definition}'

echo -e "\nAll tests completed!"