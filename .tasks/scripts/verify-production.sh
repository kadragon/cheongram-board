#!/bin/bash

# Production Verification Script
# Trace: TASK-backlog-004

set -e

echo "=== Production Verification ==="
echo ""

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

DOMAIN="https://crb.kadragon.work"
PASSED=0
FAILED=0

test_endpoint() {
  local name=$1
  local url=$2
  local expected_status=$3

  echo -n "Testing $name... "
  status=$(curl -s -o /dev/null -w "%{http_code}" "$url")

  if [ "$status" = "$expected_status" ]; then
    echo -e "${GREEN}✓ PASS${NC} (HTTP $status)"
    PASSED=$((PASSED + 1))
  else
    echo -e "${RED}✗ FAIL${NC} (Expected $expected_status, got $status)"
    FAILED=$((FAILED + 1))
  fi
}

test_json_response() {
  local name=$1
  local url=$2
  local field=$3

  echo -n "Testing $name... "
  response=$(curl -s "$url")

  if echo "$response" | jq -e "$field" > /dev/null 2>&1; then
    value=$(echo "$response" | jq -r "$field")
    echo -e "${GREEN}✓ PASS${NC} ($field: $value)"
    PASSED=$((PASSED + 1))
  else
    echo -e "${RED}✗ FAIL${NC} (Field $field not found)"
    FAILED=$((FAILED + 1))
  fi
}

echo "=== Custom Domain Tests ==="
test_endpoint "Frontend HTML" "$DOMAIN/" "200"
test_endpoint "API Health" "$DOMAIN/api" "200"
test_json_response "API Version" "$DOMAIN/api" ".version"
test_endpoint "Public Games API" "$DOMAIN/api/games" "200"
echo ""

echo "=== DNS Configuration ==="
echo -n "Checking DNS resolution... "
if nslookup crb.kadragon.work > /dev/null 2>&1; then
  echo -e "${GREEN}✓ PASS${NC}"
  PASSED=$((PASSED + 1))
else
  echo -e "${RED}✗ FAIL${NC} (DNS not resolved)"
  FAILED=$((FAILED + 1))
fi
echo ""

echo "=== SSL/TLS ==="
echo -n "Checking HTTPS certificate... "
if curl -s --head "$DOMAIN" | grep -q "HTTP/2 200"; then
  echo -e "${GREEN}✓ PASS${NC}"
  PASSED=$((PASSED + 1))
else
  echo -e "${RED}✗ FAIL${NC}"
  FAILED=$((FAILED + 1))
fi
echo ""

echo "=== Authentication (Optional) ==="
echo -e "${YELLOW}⚠️  Cloudflare Access checks require browser testing${NC}"
echo "Manually verify:"
echo "1. Visit: $DOMAIN/admin/games"
echo "2. Should redirect to Cloudflare Access login"
echo "3. After authentication, should load admin panel"
echo ""

echo "=== Summary ==="
echo -e "Passed: ${GREEN}$PASSED${NC}"
echo -e "Failed: ${RED}$FAILED${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
  echo -e "${GREEN}✓ All automated tests passed!${NC}"
  exit 0
else
  echo -e "${RED}✗ Some tests failed. Please review the output above.${NC}"
  exit 1
fi
