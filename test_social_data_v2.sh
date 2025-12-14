#!/bin/bash

NEW_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tlbl90eXBlIjoiYWNjZXNzIiwiZXhwIjoxNzY1MzQwNjk3LCJpYXQiOjE3NjUzMzcwOTcsImp0aSI6IjgzNDAwZWExMzUyYzQ0NDk4Y2E1NTQ5NWE2NTA2MDYyIiwidXNlcl9pZCI6IjcifQ.lnHtnFA5EI1HPC9BOZdDGLNdYkYSDn4On2PNg9igSjc"

echo "=== Testing document API with social data ==="
curl -H "Authorization: Bearer $NEW_TOKEN" "http://localhost:8000/api/documents/?page_size=1"