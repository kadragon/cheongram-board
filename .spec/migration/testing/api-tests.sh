#!/bin/bash

# API Testing Script for Cheongram Board Migration
# Trace: SPEC-migration-testing-1
# Tests all API endpoints for the Supabase to Cloudflare D1 migration

set -e

# Configuration
API_BASE="${API_BASE:-http://localhost:8787}"
ADMIN_EMAIL="${ADMIN_EMAIL:-kangdongouk@gmail.com}"
NON_ADMIN_EMAIL="${NON_ADMIN_EMAIL:-user@example.com}"

ADMIN_HEADERS=(-H "X-Dev-User-Email: $ADMIN_EMAIL" -H "CF-Access-Authenticated-User-Email: $ADMIN_EMAIL")
NON_ADMIN_HEADERS=(-H "X-Dev-User-Email: $NON_ADMIN_EMAIL" -H "CF-Access-Authenticated-User-Email: $NON_ADMIN_EMAIL")

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counters
PASSED=0
FAILED=0
TOTAL=0

# Helper functions
log_test() {
  echo -e "${YELLOW}[TEST]${NC} $1"
  TOTAL=$((TOTAL + 1))
}

pass() {
  echo -e "${GREEN}✓ PASS${NC}: $1"
  PASSED=$((PASSED + 1))
}

fail() {
  echo -e "${RED}✗ FAIL${NC}: $1"
  FAILED=$((FAILED + 1))
}

check_status() {
  local expected=$1
  local actual=$2
  local test_name=$3

  if [ "$actual" = "$expected" ]; then
    pass "$test_name (HTTP $actual)"
  else
    fail "$test_name (Expected $expected, got $actual)"
  fi
}

check_json_field() {
  local response=$1
  local field=$2
  local test_name=$3

  if echo "$response" | jq -e "$field" > /dev/null 2>&1; then
    pass "$test_name"
  else
    fail "$test_name (Field $field not found)"
  fi
}

# Cleanup: Store game IDs for later deletion
CREATED_GAME_IDS=()
CREATED_RENTAL_IDS=()
BASE_GAME_ID=""
BASE_GAME_CREATED=0

ensure_base_game() {
  echo "=== Setup: Ensuring base game data ==="
  local response http_code body seed_payload

  response=$(curl -s -w "\n%{http_code}" "$API_BASE/api/games")
  http_code=$(echo "$response" | tail -1)
  body=$(echo "$response" | sed '$d')

  if [ "$http_code" != "200" ]; then
    echo "Failed to fetch games list (HTTP $http_code)"
    exit 1
  fi

  BASE_GAME_ID=$(echo "$body" | jq -r '.data[0].id // empty')

  if [ -z "$BASE_GAME_ID" ]; then
    echo "No existing games found. Creating seed game for tests..."
    seed_payload=$(jq -n \
      --arg title "Seed Game" \
      --arg desc "Automated test seed game" \
      '{
        title: $title,
        min_players: 2,
        max_players: 4,
        play_time: 30,
        complexity: "low",
        description: $desc,
        image_url: "https://example.com/seed.jpg"
      }')

    response=$(curl -s -w "\n%{http_code}" -X POST "$API_BASE/api/games" \
      -H "Content-Type: application/json" \
      "${ADMIN_HEADERS[@]}" \
      -d "$seed_payload")
    http_code=$(echo "$response" | tail -1)
    body=$(echo "$response" | sed '$d')

    if [ "$http_code" = "201" ]; then
      BASE_GAME_ID=$(echo "$body" | jq -r '.data.id')
      BASE_GAME_CREATED=1
      CREATED_GAME_IDS+=("$BASE_GAME_ID")
      echo "Seeded base game with ID: $BASE_GAME_ID"
    else
      echo "Failed to create seed game (HTTP $http_code)"
      echo "Response: $body"
      exit 1
    fi
  else
    echo "Using existing game ID: $BASE_GAME_ID for public and rental tests"
  fi

  echo ""
}

echo "=================================="
echo "Migration Testing Suite"
echo "Trace: SPEC-migration-testing-1"
echo "=================================="
echo ""

ensure_base_game

# =============================================================================
# AC-1: Public API Endpoints
# =============================================================================

echo "=== AC-1: Public API Endpoints ==="
echo ""

# TEST-migration-testing-AC1-1: List Games
log_test "TEST-migration-testing-AC1-1: List all games (public)"
RESPONSE=$(curl -s -w "\n%{http_code}" "$API_BASE/api/games")
HTTP_CODE=$(echo "$RESPONSE" | tail -1)
BODY=$(echo "$RESPONSE" | sed '$d')
check_status 200 "$HTTP_CODE" "List games"
check_json_field "$BODY" ".data" "Response has data array"
check_json_field "$BODY" ".meta.timestamp" "Response has timestamp"
check_json_field "$BODY" ".meta.pagination" "Response has pagination"
echo ""

# TEST-migration-testing-AC1-2: Get Game Details
log_test "TEST-migration-testing-AC1-2: Get single game details (public)"
if [ -z "$BASE_GAME_ID" ]; then
  fail "Base game ID is not available for detail test"
else
  RESPONSE=$(curl -s -w "\n%{http_code}" "$API_BASE/api/games/$BASE_GAME_ID")
  HTTP_CODE=$(echo "$RESPONSE" | tail -1)
  BODY=$(echo "$RESPONSE" | sed '$d')
  check_status 200 "$HTTP_CODE" "Get game details"
  check_json_field "$BODY" ".data.id" "Game has ID"
  check_json_field "$BODY" ".data.title" "Game has title"
  if echo "$BODY" | jq -e '.data | has("is_rented")' > /dev/null 2>&1; then
    pass "Game has rental status"
  else
    fail "Game has rental status (Field .data.is_rented not found)"
  fi
fi
echo ""

# =============================================================================
# AC-2: Admin Authentication
# =============================================================================

echo "=== AC-2: Admin Authentication ==="
echo ""

# TEST-migration-testing-AC2-1: Admin Access Valid
log_test "TEST-migration-testing-AC2-1: Access admin endpoint with valid email"
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API_BASE/api/games" \
  -H "Content-Type: application/json" \
  "${ADMIN_HEADERS[@]}" \
  -d '{
    "title": "Test Game - Valid Admin",
    "min_players": 2,
    "max_players": 4,
    "play_time": 60,
    "complexity": "low",
    "description": "Test game for valid admin",
    "image_url": "https://example.com/test.jpg",
    "koreaboardgames_url": "https://www.koreaboardgames.com/game/test"
  }')
HTTP_CODE=$(echo "$RESPONSE" | tail -1)
BODY=$(echo "$RESPONSE" | sed '$d')
check_status 201 "$HTTP_CODE" "Create game with valid admin"
if [ "$HTTP_CODE" = "201" ]; then
  GAME_ID=$(echo "$BODY" | jq -r '.data.id')
  CREATED_GAME_IDS+=("$GAME_ID")
fi
echo ""

# TEST-migration-testing-AC2-2: Non-Admin Rejected
log_test "TEST-migration-testing-AC2-2: Reject non-admin email with 403"
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API_BASE/api/games" \
  -H "Content-Type: application/json" \
  "${NON_ADMIN_HEADERS[@]}" \
  -d '{
    "title": "Test Game - Non Admin",
    "min_players": 2,
    "max_players": 4,
    "play_time": 60,
    "complexity": "low"
  }')
HTTP_CODE=$(echo "$RESPONSE" | tail -1)
BODY=$(echo "$RESPONSE" | sed '$d')
check_status 403 "$HTTP_CODE" "Reject non-admin email"
check_json_field "$BODY" ".error.code" "Error response has code"
echo ""

# TEST-migration-testing-AC2-3: Missing Auth
log_test "TEST-migration-testing-AC2-3: Reject missing auth header with 401"
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API_BASE/api/games" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Game - No Auth",
    "min_players": 2,
    "max_players": 4,
    "play_time": 60,
    "complexity": "low"
  }')
HTTP_CODE=$(echo "$RESPONSE" | tail -1)
BODY=$(echo "$RESPONSE" | sed '$d')
check_status 401 "$HTTP_CODE" "Reject missing auth"
echo ""

# =============================================================================
# AC-3: Games CRUD Operations
# =============================================================================

echo "=== AC-3: Games CRUD Operations ==="
echo ""

# TEST-migration-testing-AC3-1: Create Game
log_test "TEST-migration-testing-AC3-1: Create new game"
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API_BASE/api/games" \
  -H "Content-Type: application/json" \
  "${ADMIN_HEADERS[@]}" \
  -d '{
    "title": "Azul",
    "min_players": 2,
    "max_players": 4,
    "play_time": 45,
    "complexity": "low",
    "description": "Tile-placement game",
    "image_url": "https://example.com/azul.jpg",
    "koreaboardgames_url": "https://www.koreaboardgames.com/game/azul"
  }')
HTTP_CODE=$(echo "$RESPONSE" | tail -1)
BODY=$(echo "$RESPONSE" | sed '$d')
check_status 201 "$HTTP_CODE" "Create game"
if [ "$HTTP_CODE" = "201" ]; then
  CREATED_GAME_ID=$(echo "$BODY" | jq -r '.data.id')
  CREATED_GAME_IDS+=("$CREATED_GAME_ID")
  check_json_field "$BODY" ".data.id" "Game has generated ID"
  check_json_field "$BODY" ".data.created_at" "Game has created_at"
fi
echo ""

# TEST-migration-testing-AC3-2: Update Game
log_test "TEST-migration-testing-AC3-2: Update existing game"
if [ ! -z "$CREATED_GAME_ID" ]; then
  RESPONSE=$(curl -s -w "\n%{http_code}" -X PUT "$API_BASE/api/games/$CREATED_GAME_ID" \
    -H "Content-Type: application/json" \
    "${ADMIN_HEADERS[@]}" \
    -d '{
      "title": "Azul - Updated",
      "play_time": 50
    }')
  HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
  BODY=$(echo "$RESPONSE" | sed '$d')
  check_status 200 "$HTTP_CODE" "Update game"
  TITLE=$(echo "$BODY" | jq -r '.data.title')
  if [ "$TITLE" = "Azul - Updated" ]; then
    pass "Game title updated correctly"
  else
    fail "Game title not updated (got: $TITLE)"
  fi
else
  fail "Cannot test update - no game created"
fi
echo ""

# TEST-migration-testing-AC3-3: Delete Game (without rentals)
log_test "TEST-migration-testing-AC3-3: Delete game without rentals"
if [ ! -z "$CREATED_GAME_ID" ]; then
  RESPONSE=$(curl -s -w "\n%{http_code}" -X DELETE "$API_BASE/api/games/$CREATED_GAME_ID" \
    "${ADMIN_HEADERS[@]}")
  HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
  check_status 204 "$HTTP_CODE" "Delete game"
  # Remove from cleanup list
  CREATED_GAME_IDS=("${CREATED_GAME_IDS[@]/$CREATED_GAME_ID}")
else
  fail "Cannot test delete - no game created"
fi
echo ""

# =============================================================================
# AC-4: Rentals CRUD Operations
# =============================================================================

echo "=== AC-4: Rentals CRUD Operations ==="
echo ""

# TEST-migration-testing-AC4-1: Create Rental
log_test "TEST-migration-testing-AC4-1: Create rental for available game"
if [ -z "$BASE_GAME_ID" ]; then
  fail "Cannot create rental - base game ID missing"
else
  RENTAL_CREATE_PAYLOAD=$(jq -n \
    --argjson game_id "$BASE_GAME_ID" \
    --arg name "John Doe" \
    --arg email "john@example.com" \
    --arg phone "010-1234-5678" \
    '{
      game_id: $game_id,
      name: $name,
      email: $email,
      phone: $phone,
      rented_at: "2025-11-06",
      due_date: "2025-11-20"
    }')

  RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API_BASE/api/rentals" \
    -H "Content-Type: application/json" \
    "${ADMIN_HEADERS[@]}" \
    -d "$RENTAL_CREATE_PAYLOAD")
  HTTP_CODE=$(echo "$RESPONSE" | tail -1)
  BODY=$(echo "$RESPONSE" | sed '$d')
  check_status 201 "$HTTP_CODE" "Create rental"
  if [ "$HTTP_CODE" = "201" ]; then
    RENTAL_ID=$(echo "$BODY" | jq -r '.data.id')
    CREATED_RENTAL_IDS+=("$RENTAL_ID")
    check_json_field "$BODY" ".data.id" "Rental has ID"
  fi
fi
echo ""

# TEST-migration-testing-AC4-2: Prevent Duplicate Rental
log_test "TEST-migration-testing-AC4-2: Prevent rental for already rented game"
if [ -z "$BASE_GAME_ID" ]; then
  fail "Cannot test duplicate rental - base game ID missing"
else
  DUPLICATE_RENTAL_PAYLOAD=$(jq -n \
    --argjson game_id "$BASE_GAME_ID" \
    --arg name "Jane Doe" \
    --arg email "jane@example.com" \
    '{
      game_id: $game_id,
      name: $name,
      email: $email,
      rented_at: "2025-11-06",
      due_date: "2025-11-13"
    }')

  RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API_BASE/api/rentals" \
    -H "Content-Type: application/json" \
    "${ADMIN_HEADERS[@]}" \
    -d "$DUPLICATE_RENTAL_PAYLOAD")
  HTTP_CODE=$(echo "$RESPONSE" | tail -1)
  BODY=$(echo "$RESPONSE" | sed '$d')
  check_status 409 "$HTTP_CODE" "Prevent duplicate rental"
  check_json_field "$BODY" ".error.code" "Error has code"
fi
echo ""

# TEST-migration-testing-AC4-4: Extend Rental
log_test "TEST-migration-testing-AC4-4: Extend rental due date"
if [ ! -z "$RENTAL_ID" ]; then
  RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API_BASE/api/rentals/$RENTAL_ID/extend" \
    -H "Content-Type: application/json" \
    "${ADMIN_HEADERS[@]}" \
    -d '{
      "new_due_date": "2025-12-01"
    }')
  HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
  BODY=$(echo "$RESPONSE" | sed '$d')
  check_status 200 "$HTTP_CODE" "Extend rental"
  DUE_DATE=$(echo "$BODY" | jq -r '.data.due_date')
  if [ "$DUE_DATE" = "2025-12-01" ]; then
    pass "Rental due date extended"
  else
    fail "Rental due date not extended (got: $DUE_DATE)"
  fi
else
  fail "Cannot test extend - no rental created"
fi
echo ""

# TEST-migration-testing-AC4-3: Return Rental
log_test "TEST-migration-testing-AC4-3: Return rental and mark game available"
if [ ! -z "$RENTAL_ID" ]; then
  RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API_BASE/api/rentals/$RENTAL_ID/return" \
    "${ADMIN_HEADERS[@]}")
  HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
  BODY=$(echo "$RESPONSE" | sed '$d')
  check_status 200 "$HTTP_CODE" "Return rental"
  check_json_field "$BODY" ".data.returned_at" "Rental has returned_at"
  # Remove from cleanup list
  CREATED_RENTAL_IDS=("${CREATED_RENTAL_IDS[@]/$RENTAL_ID}")
else
  fail "Cannot test return - no rental created"
fi
echo ""

# =============================================================================
# AC-5: Error Handling
# =============================================================================

echo "=== AC-5: Error Handling ==="
echo ""

# TEST-migration-testing-AC5-1: Invalid Input
log_test "TEST-migration-testing-AC5-1: Invalid input returns 400"
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API_BASE/api/games" \
  -H "Content-Type: application/json" \
  "${ADMIN_HEADERS[@]}" \
  -d '{
    "min_players": 2
  }')
HTTP_CODE=$(echo "$RESPONSE" | tail -1)
BODY=$(echo "$RESPONSE" | sed '$d')
check_status 400 "$HTTP_CODE" "Invalid input"
check_json_field "$BODY" ".error.code" "Error has code"
echo ""

# TEST-migration-testing-AC5-2: Not Found
log_test "TEST-migration-testing-AC5-2: Non-existent resource returns 404"
RESPONSE=$(curl -s -w "\n%{http_code}" "$API_BASE/api/games/99999")
HTTP_CODE=$(echo "$RESPONSE" | tail -1)
BODY=$(echo "$RESPONSE" | sed '$d')
check_status 404 "$HTTP_CODE" "Not found"
check_json_field "$BODY" ".error.code" "Error has code"
echo ""

# TEST-migration-testing-AC5-4: Invalid Complexity
log_test "TEST-migration-testing-AC5-4: Invalid complexity value rejected"
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API_BASE/api/games" \
  -H "Content-Type: application/json" \
  "${ADMIN_HEADERS[@]}" \
  -d '{
    "title": "Test Game",
    "min_players": 2,
    "max_players": 4,
    "play_time": 60,
    "complexity": "invalid"
  }')
HTTP_CODE=$(echo "$RESPONSE" | tail -1)
BODY=$(echo "$RESPONSE" | sed '$d')
check_status 400 "$HTTP_CODE" "Invalid complexity"
echo ""

# =============================================================================
# AC-6: Business Logic Validation
# =============================================================================

echo "=== AC-6: Business Logic Validation ==="
echo ""

# TEST-migration-testing-AC6-4: Player Count Validation
log_test "TEST-migration-testing-AC6-4: Validate player count constraints (min > max)"
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API_BASE/api/games" \
  -H "Content-Type: application/json" \
  "${ADMIN_HEADERS[@]}" \
  -d '{
    "title": "Invalid Game",
    "min_players": 4,
    "max_players": 2,
    "play_time": 60,
    "complexity": "low"
  }')
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
check_status 400 "$HTTP_CODE" "Player count validation (min > max)"
echo ""

# =============================================================================
# Cleanup
# =============================================================================

echo "=== Cleanup ==="
echo ""

# Delete created games
for game_id in "${CREATED_GAME_IDS[@]}"; do
  if [ ! -z "$game_id" ]; then
    echo "Deleting test game ID: $game_id"
    curl -s -X DELETE "$API_BASE/api/games/$game_id" \
      "${ADMIN_HEADERS[@]}" > /dev/null
  fi
done

# Delete created rentals
for rental_id in "${CREATED_RENTAL_IDS[@]}"; do
  if [ ! -z "$rental_id" ]; then
    echo "Returning test rental ID: $rental_id"
    curl -s -X POST "$API_BASE/api/rentals/$rental_id/return" \
      "${ADMIN_HEADERS[@]}" > /dev/null
  fi
done

echo ""
echo "=================================="
echo "Test Summary"
echo "=================================="
echo "Total Tests: $TOTAL"
echo -e "${GREEN}Passed: $PASSED${NC}"
echo -e "${RED}Failed: $FAILED${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
  echo -e "${GREEN}✓ All tests passed!${NC}"
  exit 0
else
  echo -e "${RED}✗ Some tests failed${NC}"
  exit 1
fi
