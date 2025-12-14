#!/bin/bash

# Test script with a new word to test auto-definition

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

# Test 1: Add a new word that should have a definition
echo -e "\nTest 1: Adding a new word 'algorithm'..."
ADD_RESPONSE=$(curl -s -X POST http://localhost:8000/api/study/vocabulary/create/ \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "word": "algorithm"
  }')

echo "Response:"
echo $ADD_RESPONSE | jq .

# Get the word ID and check if it has a definition
WORD_ID=$(echo $ADD_RESPONSE | jq -r '.id')
WORD_DEFINITION=$(echo $ADD_RESPONSE | jq -r '.definition')

echo -e "\nWord ID: $WORD_ID"
echo "Definition: $WORD_DEFINITION"

if [ "$WORD_DEFINITION" != "null" ] && [ "$WORD_DEFINITION" != "" ]; then
  echo "✓ SUCCESS: Word was added with definition automatically!"
else
  echo "✗ FAILED: Word was added but no definition was found"
fi

# Test 2: Manually update definition for a word without definition
echo -e "\nTest 2: Getting first word without definition..."
VOCAB_RESPONSE=$(curl -s -X GET "http://localhost:8000/api/study/vocabulary/?page_size=5" \
  -H "Authorization: Bearer $TOKEN")

# Find a word without definition
WORD_ID_TO_UPDATE=$(echo $VOCAB_RESPONSE | jq -r '.results[] | select(.definition == "" or .definition == null) | .id' | head -n1)
WORD_TO_UPDATE=$(echo $VOCAB_RESPONSE | jq -r '.results[] | select(.definition == "" or .definition == null) | .word' | head -n1)

if [ "$WORD_ID_TO_UPDATE" != "null" ] && [ "$WORD_ID_TO_UPDATE" != "" ]; then
  echo "Found word without definition: $WORD_TO_UPDATE (ID: $WORD_ID_TO_UPDATE)"

  echo -e "\nTest 3: Manually updating definition for '$WORD_TO_UPDATE'..."
  UPDATE_RESPONSE=$(curl -s -X POST http://localhost:8000/api/study/vocabulary/$WORD_ID_TO_UPDATE/update-definition/ \
    -H "Authorization: Bearer $TOKEN")

  echo "Update response:"
  echo $UPDATE_RESPONSE | jq .
else
  echo -e "\nNo words without definition found to test manual update"
fi

# Test 4: Batch update all missing definitions
echo -e "\nTest 4: Batch updating all missing definitions..."
BATCH_UPDATE_RESPONSE=$(curl -s -X POST http://localhost:8000/api/study/vocabulary/update-missing-definitions/ \
  -H "Authorization: Bearer $TOKEN")

echo "Batch update response:"
echo $BATCH_UPDATE_RESPONSE | jq .

# Test 5: Check final state
echo -e "\nTest 5: Checking final vocabulary state..."
FINAL_VOCAB_RESPONSE=$(curl -s -X GET "http://localhost:8000/api/study/vocabulary/?page_size=10" \
  -H "Authorization: Bearer $TOKEN")

# Count words with and without definitions
TOTAL_WORDS=$(echo $FINAL_VOCAB_RESPONSE | jq '.results | length')
WORDS_WITH_DEFINITIONS=$(echo $FINAL_VOCAB_RESPONSE | jq '[.results[] | select(.definition != "" and .definition != null)] | length')
WORDS_WITHOUT_DEFINITIONS=$(echo $FINAL_VOCAB_RESPONSE | jq '[.results[] | select(.definition == "" or .definition == null)] | length')

echo "Total words: $TOTAL_WORDS"
echo "Words with definitions: $WORDS_WITH_DEFINITIONS"
echo "Words without definitions: $WORDS_WITHOUT_DEFINITIONS"

echo -e "\nAll tests completed!"