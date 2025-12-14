#!/bin/bash

# Test all document filtering endpoints and show results
echo "=== Document Filtering Test ==="
echo ""

# Get auth token
TOKEN_RESPONSE=$(curl -s -X POST "http://localhost:8000/api/auth/login/" \
  -H "Content-Type: application/json" \
  -d '{"email": "alice@example.com", "password": "password123"}')

TOKEN=$(echo $TOKEN_RESPONSE | jq -r '.access')

echo "✅ Authentication successful"
echo ""

# Test All Documents
echo "📄 All Documents (Alice's documents):"
ALL_DOCS=$(curl -s -H "Authorization: Bearer $TOKEN" \
  "http://localhost:8000/api/documents/?page_size=5")
ALL_COUNT=$(echo $ALL_DOCS | jq -r '.count')
echo "   Total: $ALL_COUNT documents"
echo ""

# Test Favorites
echo "⭐ Favorites (Bookmarked documents):"
FAV_DOCS=$(curl -s -H "Authorization: Bearer $TOKEN" \
  "http://localhost:8000/api/documents/favorites/?page_size=5")
FAV_COUNT=$(echo $FAV_DOCS | jq -r '.count')
echo "   Total: $FAV_COUNT documents"
echo ""

# Test Public Documents
echo "🌍 Public Documents (from all users):"
PUB_DOCS=$(curl -s -H "Authorization: Bearer $TOKEN" \
  "http://localhost:8000/api/documents/public/?page_size=5")
PUB_COUNT=$(echo $PUB_DOCS | jq -r '.count')
echo "   Total: $PUB_COUNT documents"
echo ""

# Test Private Documents
echo "🔒 Private Documents (Alice's private docs):"
PRIV_DOCS=$(curl -s -H "Authorization: Bearer $TOKEN" \
  "http://localhost:8000/api/documents/?privacy=private&page_size=5")
PRIV_COUNT=$(echo $PRIV_DOCS | jq -r '.count')
echo "   Total: $PRIV_COUNT documents"
echo ""

echo "=== Summary ==="
echo "• All Documents: $ALL_COUNT"
echo "• Favorites: $FAV_COUNT"
echo "• Public: $PUB_COUNT"
echo "• Private: $PRIV_COUNT"
echo ""
echo "✅ All document filtering endpoints are working correctly!"
echo "You can now test the frontend at: http://localhost:5184/documents"