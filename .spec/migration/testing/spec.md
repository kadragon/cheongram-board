# Migration Testing & Validation Specification

```yaml
spec_id: SPEC-migration-testing-1
created: 2025-11-06
status: in-progress
priority: critical
owner: qa-team
agents:
  base_profile: .agents/profiles/cloudflare-workers@2025-11-06.md
  catalogs:
    - .agents/catalogs/database-migration.md
    - .agents/catalogs/authentication.md
parent_spec: SPEC-migration-supabase-to-cloudflare-1
test_framework: chrome-devtools-mcp
```

## 1. Overview

### 1.1 Objective
Validate the complete migration from Supabase to Cloudflare D1 through comprehensive automated and manual testing using Chrome DevTools MCP for end-to-end validation.

### 1.2 Scope
- API endpoint functionality (Games, Rentals)
- Authentication and authorization
- Database operations (CRUD)
- Business logic validation
- Error handling and edge cases
- UI interaction testing
- Performance validation

### 1.3 Test Environment
- **Local Dev Server**: `http://localhost:3000` (Next.js dev)
- **Preview Server**: Wrangler with OpenNext build
- **Database**: Local D1 instance via Wrangler
- **Authentication**: X-Dev-User-Email header simulation
- **Browser Automation**: Chrome DevTools MCP

## 2. Behaviour (Given-When-Then)

### AC-1: Public API Endpoints
**Given** a deployed application with test data
**When** public endpoints are accessed without authentication
**Then** games list and details should return successfully with proper structure

**Test IDs**:
- TEST-migration-testing-AC1-1: List all games
- TEST-migration-testing-AC1-2: Get single game details

### AC-2: Admin Authentication
**Given** admin email configured in ADMIN_EMAILS
**When** X-Dev-User-Email header is set to admin email
**Then** admin endpoints should be accessible with proper authorization

**Test IDs**:
- TEST-migration-testing-AC2-1: Access admin endpoints with valid email
- TEST-migration-testing-AC2-2: Reject non-admin email with 403
- TEST-migration-testing-AC2-3: Reject missing header with 401

### AC-3: Games CRUD Operations
**Given** admin authentication
**When** CRUD operations are performed on games
**Then** all operations should succeed with proper validation and responses

**Test IDs**:
- TEST-migration-testing-AC3-1: Create new game
- TEST-migration-testing-AC3-2: Update existing game
- TEST-migration-testing-AC3-3: Delete game (without rentals)
- TEST-migration-testing-AC3-4: Prevent delete game with active rentals

### AC-4: Rentals CRUD Operations
**Given** admin authentication and existing games
**When** rental operations are performed
**Then** all operations should maintain data integrity and business rules

**Test IDs**:
- TEST-migration-testing-AC4-1: Create rental for available game
- TEST-migration-testing-AC4-2: Prevent rental for already rented game
- TEST-migration-testing-AC4-3: Return rental and mark game available
- TEST-migration-testing-AC4-4: Extend rental due date

### AC-5: Error Handling
**Given** invalid or malformed requests
**When** API endpoints are called with bad data
**Then** proper error responses should be returned with correct codes

**Test IDs**:
- TEST-migration-testing-AC5-1: Invalid game data returns 400
- TEST-migration-testing-AC5-2: Non-existent resource returns 404
- TEST-migration-testing-AC5-3: Duplicate rental returns 409
- TEST-migration-testing-AC5-4: Invalid complexity value rejected

### AC-6: Business Logic Validation
**Given** database state and business rules
**When** operations are performed
**Then** data integrity and business constraints should be enforced

**Test IDs**:
- TEST-migration-testing-AC6-1: Game marked as rented after rental creation
- TEST-migration-testing-AC6-2: Game marked as available after return
- TEST-migration-testing-AC6-3: Cannot create rental for rented game
- TEST-migration-testing-AC6-4: Validate player count constraints (min <= max)

### AC-7: UI Functionality
**Given** web interface accessed via browser
**When** user interacts with UI elements
**Then** UI should function properly with correct data display

**Test IDs**:
- TEST-migration-testing-AC7-1: Games list displays correctly
- TEST-migration-testing-AC7-2: Game details page loads
- TEST-migration-testing-AC7-3: Admin interface accessible with auth
- TEST-migration-testing-AC7-4: Forms validate input correctly

## 3. Test Data Setup

### 3.1 Sample Games
```json
[
  {
    "title": "Catan",
    "min_players": 3,
    "max_players": 4,
    "play_time": 90,
    "complexity": "medium",
    "description": "Classic resource management game"
  },
  {
    "title": "Pandemic",
    "min_players": 2,
    "max_players": 4,
    "play_time": 45,
    "complexity": "medium",
    "description": "Cooperative disease control game"
  },
  {
    "title": "Ticket to Ride",
    "min_players": 2,
    "max_players": 5,
    "play_time": 60,
    "complexity": "low",
    "description": "Train route building game"
  }
]
```

### 3.2 Database Initialization
```bash
# Apply migrations
npx wrangler d1 migrations apply cheongram-board-db --local

# Insert test data
npx wrangler d1 execute cheongram-board-db --local --file=test-data.sql
```

## 4. API Test Cases

### 4.1 Public Endpoints

#### TEST-migration-testing-AC1-1: List Games
```yaml
method: GET
endpoint: /api/games
headers: {}
expected:
  status: 200
  structure:
    data: array
    meta:
      timestamp: string
  validation:
    - data should be array
    - each game should have required fields
    - meta.timestamp should be ISO 8601
```

#### TEST-migration-testing-AC1-2: Get Game Details
```yaml
method: GET
endpoint: /api/games/1
headers: {}
expected:
  status: 200
  structure:
    data:
      id: number
      title: string
      is_rented: boolean
    meta:
      timestamp: string
```

### 4.2 Admin Authentication

#### TEST-migration-testing-AC2-1: Admin Access Valid
```yaml
method: POST
endpoint: /api/games
headers:
  X-Dev-User-Email: kangdongouk@gmail.com
  Content-Type: application/json
body:
  title: "Test Game"
  min_players: 2
  max_players: 4
  play_time: 60
  complexity: "low"
expected:
  status: 201
  structure:
    data:
      id: number
      title: "Test Game"
```

#### TEST-migration-testing-AC2-2: Non-Admin Rejected
```yaml
method: POST
endpoint: /api/games
headers:
  X-Dev-User-Email: user@example.com
  Content-Type: application/json
expected:
  status: 403
  structure:
    error:
      code: "FORBIDDEN"
      userMessage: string
```

#### TEST-migration-testing-AC2-3: Missing Auth
```yaml
method: POST
endpoint: /api/games
headers:
  Content-Type: application/json
expected:
  status: 401
  structure:
    error:
      code: "UNAUTHORIZED"
```

### 4.3 Games CRUD

#### TEST-migration-testing-AC3-1: Create Game
```yaml
method: POST
endpoint: /api/games
headers:
  X-Dev-User-Email: kangdongouk@gmail.com
body:
  title: "Azul"
  min_players: 2
  max_players: 4
  play_time: 45
  complexity: "low"
  description: "Tile-placement game"
expected:
  status: 201
  validation:
    - data.id should be generated
    - data.title should match input
    - data.created_at should be present
```

#### TEST-migration-testing-AC3-2: Update Game
```yaml
method: PUT
endpoint: /api/games/1
headers:
  X-Dev-User-Email: kangdongouk@gmail.com
body:
  title: "Catan - Updated"
  play_time: 120
expected:
  status: 200
  validation:
    - data.title should be "Catan - Updated"
    - data.play_time should be 120
    - data.updated_at should be updated
```

#### TEST-migration-testing-AC3-3: Delete Game
```yaml
method: DELETE
endpoint: /api/games/{game_id_without_rentals}
headers:
  X-Dev-User-Email: kangdongouk@gmail.com
expected:
  status: 200
  validation:
    - Game should be removed from database
```

#### TEST-migration-testing-AC3-4: Prevent Delete with Rentals
```yaml
method: DELETE
endpoint: /api/games/{game_id_with_active_rental}
headers:
  X-Dev-User-Email: kangdongouk@gmail.com
expected:
  status: 409
  structure:
    error:
      code: "CONFLICT"
      userMessage: string
```

### 4.4 Rentals CRUD

#### TEST-migration-testing-AC4-1: Create Rental
```yaml
method: POST
endpoint: /api/rentals
headers:
  X-Dev-User-Email: kangdongouk@gmail.com
body:
  game_id: 1
  name: "John Doe"
  email: "john@example.com"
  phone: "010-1234-5678"
  rented_at: "2025-11-06"
  due_date: "2025-11-20"
expected:
  status: 201
  validation:
    - rental.id should be generated
    - rental.game_id should match
    - game should be marked as rented
```

#### TEST-migration-testing-AC4-2: Prevent Duplicate Rental
```yaml
method: POST
endpoint: /api/rentals
headers:
  X-Dev-User-Email: kangdongouk@gmail.com
body:
  game_id: 1  # Already rented
  name: "Jane Doe"
  rented_at: "2025-11-06"
  due_date: "2025-11-13"
expected:
  status: 409
  structure:
    error:
      code: "CONFLICT"
```

#### TEST-migration-testing-AC4-3: Return Rental
```yaml
method: POST
endpoint: /api/rentals/{rental_id}/return
headers:
  X-Dev-User-Email: kangdongouk@gmail.com
expected:
  status: 200
  validation:
    - rental.returned_at should be set
    - game should be marked as available
```

#### TEST-migration-testing-AC4-4: Extend Rental
```yaml
method: POST
endpoint: /api/rentals/{rental_id}/extend
headers:
  X-Dev-User-Email: kangdongouk@gmail.com
body:
  new_due_date: "2025-12-01"
expected:
  status: 200
  validation:
    - rental.due_date should be "2025-12-01"
    - rental should still be active
```

### 4.5 Error Handling

#### TEST-migration-testing-AC5-1: Invalid Input
```yaml
method: POST
endpoint: /api/games
headers:
  X-Dev-User-Email: kangdongouk@gmail.com
body:
  # Missing required title field
  min_players: 2
expected:
  status: 400
  structure:
    error:
      code: "VALIDATION_ERROR"
```

#### TEST-migration-testing-AC5-2: Not Found
```yaml
method: GET
endpoint: /api/games/99999
expected:
  status: 404
  structure:
    error:
      code: "NOT_FOUND"
```

#### TEST-migration-testing-AC5-4: Invalid Complexity
```yaml
method: POST
endpoint: /api/games
headers:
  X-Dev-User-Email: kangdongouk@gmail.com
body:
  title: "Test Game"
  complexity: "invalid"  # Should be 'low', 'medium', or 'high'
expected:
  status: 400
  structure:
    error:
      code: "VALIDATION_ERROR"
```

## 5. Browser UI Test Cases

### 5.1 Chrome DevTools MCP Tests

#### TEST-migration-testing-AC7-1: Games List UI
```yaml
test: Navigate to home page and verify games list
steps:
  1. Navigate to http://localhost:3000
  2. Wait for games list to load
  3. Verify at least 3 game cards are displayed
  4. Verify each card shows title, players, time, complexity
  5. Verify "Available" or "Rented" status badge
```

#### TEST-migration-testing-AC7-2: Game Details Page
```yaml
test: Navigate to game details and verify information
steps:
  1. Navigate to http://localhost:3000
  2. Click on first game card
  3. Verify URL changes to /games/{id}
  4. Verify game title, description, and details displayed
  5. Verify rental status shown
```

#### TEST-migration-testing-AC7-3: Admin Interface Access
```yaml
test: Access admin interface with authentication header
setup:
  - Install ModHeader extension
  - Set X-Dev-User-Email: kangdongouk@gmail.com
steps:
  1. Navigate to http://localhost:3000/admin
  2. Verify admin interface loads
  3. Verify "Add Game" button visible
  4. Verify rental management visible
```

#### TEST-migration-testing-AC7-4: Form Validation
```yaml
test: Test game creation form validation
setup:
  - Set X-Dev-User-Email header
steps:
  1. Navigate to /admin
  2. Click "Add Game" button
  3. Submit empty form
  4. Verify validation errors shown
  5. Fill valid data
  6. Verify game created successfully
```

## 6. Business Logic Validation

### TEST-migration-testing-AC6-1: Game Rental Status
```sql
-- Verify game marked as rented after rental creation
-- Setup: Create game and rental
-- Validation:
SELECT g.id, g.title,
  CASE WHEN r.id IS NOT NULL AND r.returned_at IS NULL
    THEN 'Rented'
    ELSE 'Available'
  END as status
FROM games g
LEFT JOIN rentals r ON g.id = r.game_id AND r.returned_at IS NULL
WHERE g.id = ?;

-- Expected: status = 'Rented' after creating rental
```

### TEST-migration-testing-AC6-2: Game Available After Return
```sql
-- Verify game marked as available after return
-- Setup: Return an active rental
-- Validation: Same query as AC6-1
-- Expected: status = 'Available' after return
```

### TEST-migration-testing-AC6-4: Player Count Validation
```yaml
test: Validate player count constraints
cases:
  - input: { min_players: 4, max_players: 2 }
    expected: 400 error (min > max)
  - input: { min_players: 2, max_players: 4 }
    expected: 201 success
  - input: { min_players: -1, max_players: 4 }
    expected: 400 error (negative value)
```

## 7. Test Execution Plan

### 7.1 Automated API Tests (curl/fetch)
```bash
# Run automated API test suite
npm run test:api  # To be created

# Or manual execution
bash .spec/migration/testing/api-tests.sh
```

### 7.2 Browser E2E Tests (Chrome MCP)
```bash
# Run Chrome DevTools MCP automated tests
npm run test:e2e  # To be created

# Or use Claude Code with Chrome MCP
# Execute test scenarios via MCP integration
```

### 7.3 Manual Validation Checklist
Follow TESTING.md checklist:
- [ ] All API endpoints tested
- [ ] Authentication/authorization validated
- [ ] Error handling verified
- [ ] Business logic confirmed
- [ ] UI functionality checked

## 8. Success Criteria

### 8.1 All Tests Pass
- ✅ All API tests return expected status codes
- ✅ All authentication tests pass authorization checks
- ✅ All CRUD operations work correctly
- ✅ All error cases return proper error responses
- ✅ All business logic constraints enforced
- ✅ All UI tests complete successfully

### 8.2 Performance Baselines
- ✅ API response times < 200ms (p95)
- ✅ Database queries < 100ms
- ✅ Page load times < 2s

### 8.3 Data Integrity
- ✅ No orphaned records after operations
- ✅ Foreign key constraints enforced
- ✅ Business rules maintained

## 9. Rollback Criteria

If any of the following occur, rollback to previous version:
- Critical test failures (>10% failure rate)
- Data corruption detected
- Performance regression >30%
- Security vulnerabilities identified

## 10. Deployment Readiness

After all tests pass:
1. Tag successful test run in git
2. Update `.tasks/log-2025-11-06.md` with GREEN status
3. Proceed to deployment phase
4. Monitor production metrics

## 11. Tracing

```yaml
spec: SPEC-migration-testing-1
parent: SPEC-migration-supabase-to-cloudflare-1
tasks:
  - TASK-testing-001: Setup test environment
  - TASK-testing-002: Execute API tests
  - TASK-testing-003: Execute UI tests
  - TASK-testing-004: Validate business logic
  - TASK-testing-005: Document results
tests:
  - AC1: TEST-migration-testing-AC1-{1,2}
  - AC2: TEST-migration-testing-AC2-{1,2,3}
  - AC3: TEST-migration-testing-AC3-{1,2,3,4}
  - AC4: TEST-migration-testing-AC4-{1,2,3,4}
  - AC5: TEST-migration-testing-AC5-{1,2,4}
  - AC6: TEST-migration-testing-AC6-{1,2,3,4}
  - AC7: TEST-migration-testing-AC7-{1,2,3,4}
```
