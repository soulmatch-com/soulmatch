#!/bin/bash
# Test admin login API directly

echo "Testing Admin Login API..."
echo ""

curl -X POST http://localhost:3000/api/admin/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@soulmatch.com",
    "password": "Admin@123"
  }' \
  -w "\n\nStatus: %{http_code}\n" \
  -s | jq '.' 2>/dev/null || cat

echo ""
echo "If status is 500, check terminal logs where 'npm run dev' is running"
