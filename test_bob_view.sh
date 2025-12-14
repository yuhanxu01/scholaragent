#!/bin/bash

BOB_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tlbl90eXBlIjoiYWNjZXNzIiwiZXhwIjoxNzY1MzU3NjQ3LCJpYXQiOjE3NjUzNTQwNDcsImp0aSI6Ijg4NTdkZjk1MmU1MzQ3YTI5OGQzMDk2NDJlN2ZmMzgyIiwidXNlcl9pZCI6IjgifQ.TmdkR684WH1SrM_FqWHASCI6vYeNToa4cUtQ0LRAnbs"

echo "=== Bob viewing Alice's document (should see collect button) ==="
curl -H "Authorization: Bearer $BOB_TOKEN" "http://localhost:8000/api/documents/?page_size=1"