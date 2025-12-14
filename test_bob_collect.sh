#!/bin/bash

BOB_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tlbl90eXBlIjoiYWNjZXNzIiwiZXhwIjoxNzY1MzU3NjQ3LCJpYXQiOjE3NjUzNTQwNDcsImp0aSI6Ijg4NTdkZjk1MmU1MzQ3YTI5OGQzMDk2NDJlN2ZmMzgyIiwidXNlcl9pZCI6IjgifQ.TmdkR684WH1SrM_FqWHASCI6vYeNToa4cUtQ0LRAnbs"

echo "=== Bob trying to collect Alice's document ==="
# Use Alice's document ID from earlier test
curl -X POST -H "Authorization: Bearer $BOB_TOKEN" -H "Content-Type: application/json" -d '{"document": "6ccb6161-7a95-46ab-bc68-20478e51ca50", "collection_name": "Bob的收藏夹", "notes": "测试收藏功能"}' "http://localhost:8000/api/users/collections/"