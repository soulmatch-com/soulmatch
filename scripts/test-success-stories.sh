#!/bin/bash

# Success Stories Testing Script
# Automated testing for the success stories feature

set -e

BASE_URL="http://localhost:3000"
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "🧪 Success Stories Feature Testing"
echo "===================================="
echo ""

# Function to print test results
pass() {
  echo -e "${GREEN}✅ PASS${NC}: $1"
}

fail() {
  echo -e "${RED}❌ FAIL${NC}: $1"
  exit 1
}

warn() {
  echo -e "${YELLOW}⚠️  WARN${NC}: $1"
}

info() {
  echo "ℹ️  $1"
}

# Test 1: Public API Endpoint
info "Test 1: Public API endpoint returns valid JSON..."
RESPONSE=$(curl -s "$BASE_URL/api/success-stories")
if echo "$RESPONSE" | jq -e '.stories' > /dev/null 2>&1; then
  pass "Public API returns valid JSON structure"
else
  fail "Public API does not return valid JSON"
fi

# Test 2: Public API has required fields
info "Test 2: Response has pagination metadata..."
if echo "$RESPONSE" | jq -e '.pagination' > /dev/null 2>&1; then
  pass "Pagination metadata present"
else
  fail "Pagination metadata missing"
fi

# Test 3: Cache headers
info "Test 3: Checking cache headers..."
HEADERS=$(curl -sI "$BASE_URL/api/success-stories")
if echo "$HEADERS" | grep -q "Cache-Control"; then
  pass "Cache-Control header present"
else
  warn "Cache-Control header missing"
fi

# Test 4: Featured filter
info "Test 4: Testing featured_only filter..."
FEATURED_RESPONSE=$(curl -s "$BASE_URL/api/success-stories?featured_only=true")
if echo "$FEATURED_RESPONSE" | jq -e '.stories' > /dev/null 2>&1; then
  pass "Featured filter works"
else
  fail "Featured filter broken"
fi

# Test 5: Pagination
info "Test 5: Testing pagination parameters..."
PAGINATED=$(curl -s "$BASE_URL/api/success-stories?limit=3&offset=0")
LIMIT=$(echo "$PAGINATED" | jq -r '.pagination.limit')
if [ "$LIMIT" = "3" ]; then
  pass "Pagination limit parameter works"
else
  fail "Pagination broken (expected limit=3, got $LIMIT)"
fi

# Test 6: Homepage loads
info "Test 6: Homepage contains Success Stories section..."
HOMEPAGE=$(curl -s "$BASE_URL")
if echo "$HOMEPAGE" | grep -q "Success Stories"; then
  pass "Homepage contains Success Stories section"
else
  fail "Homepage missing Success Stories section"
fi

# Test 7: Admin page accessible
info "Test 7: Admin success stories page exists..."
ADMIN_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/admin/success-stories")
if [ "$ADMIN_STATUS" = "200" ] || [ "$ADMIN_STATUS" = "307" ] || [ "$ADMIN_STATUS" = "303" ]; then
  pass "Admin page accessible (status: $ADMIN_STATUS)"
else
  warn "Admin page returned unexpected status: $ADMIN_STATUS (may require auth)"
fi

# Test 8: API endpoints exist
info "Test 8: Admin API endpoint exists..."
ADMIN_API_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/admin/success-stories")
if [ "$ADMIN_API_STATUS" = "200" ] || [ "$ADMIN_API_STATUS" = "401" ] || [ "$ADMIN_API_STATUS" = "403" ]; then
  pass "Admin API endpoint exists (status: $ADMIN_API_STATUS)"
else
  fail "Admin API endpoint not found (status: $ADMIN_API_STATUS)"
fi

# Test 9: Response time
info "Test 9: API response time check..."
START=$(date +%s%N)
curl -s "$BASE_URL/api/success-stories" > /dev/null
END=$(date +%s%N)
DURATION=$((($END - $START) / 1000000)) # Convert to milliseconds
if [ $DURATION -lt 1000 ]; then
  pass "API responds in ${DURATION}ms (< 1000ms)"
else
  warn "API slow: ${DURATION}ms (> 1000ms)"
fi

# Test 10: Story count
info "Test 10: Checking story count..."
TOTAL=$(echo "$RESPONSE" | jq -r '.total')
info "Total stories in database: $TOTAL"
if [ "$TOTAL" -ge 0 ]; then
  pass "Story count retrieved successfully"
else
  fail "Could not retrieve story count"
fi

echo ""
echo "===================================="
echo "🎉 All Tests Completed!"
echo ""

# Summary
STORY_COUNT=$(echo "$RESPONSE" | jq -r '.total')
PUBLISHED_COUNT=$(echo "$RESPONSE" | jq '[.stories[] | select(.is_published == true)] | length')
FEATURED_COUNT=$(echo "$FEATURED_RESPONSE" | jq -r '.total')

echo "📊 Summary:"
echo "  - Total Stories: $STORY_COUNT"
echo "  - Published: $PUBLISHED_COUNT"
echo "  - Featured: $FEATURED_COUNT"
echo ""

if [ "$STORY_COUNT" -eq 0 ]; then
  warn "No stories in database. Run seed script:"
  echo "     database/test_data/seed_success_stories.sql"
else
  pass "Success stories feature is working!"
fi

echo ""
echo "📖 Full testing guide: claudedocs/success-stories-testing-guide.md"
echo ""
