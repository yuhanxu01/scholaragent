#!/bin/bash

TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tlbl90eXBlIjoiYWNjZXNzIiwiZXhwIjoxNzY1NTc4NjE1LCJpYXQiOjE3NjU1NzUwMTUsImp0aSI6ImQxMzZmZjIyNzhmODQ4NjhiNGU5NGJiMTk0Njk3NzdmIiwidXNlcl9pZCI6IjcifQ.47_mE6Lx9TPbVH8VJUkM8avPQMyfptOKlGktdBP5Eh0"

echo "Testing different URL patterns..."

echo -e "\n1. No query parameter (should work):"
curl -s -H "Authorization: Bearer $TOKEN" "http://localhost:8000/api/study/vocabulary/export/" | jq '.word' 2>/dev/null || echo "Failed"

echo -e "\n2. With format=json:"
curl -s -H "Authorization: Bearer $TOKEN" "http://localhost:8000/api/study/vocabulary/export/?format=json" | jq '.word' 2>/dev/null || echo "Failed"

echo -e "\n3. With format=csv:"
curl -s -H "Authorization: Bearer $TOKEN" "http://localhost:8000/api/study/vocabulary/export/?format=csv" | head -1 || echo "Failed"

echo -e "\n4. Test status codes:"
echo -n "JSON: "
curl -s -o /dev/null -w "%{http_code}" -H "Authorization: Bearer $TOKEN" "http://localhost:8000/api/study/vocabulary/export/?format=json"

echo -n " CSV: "
curl -s -o /dev/null -w "%{http_code}" -H "Authorization: Bearer $TOKEN" "http://localhost:8000/api/study/vocabulary/export/?format=csv"