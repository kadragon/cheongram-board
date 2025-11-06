# Supabase to Cloudflare Workers + D1 Migration Specification

```yaml
spec_id: SPEC-migration-supabase-to-cloudflare-1
created: 2025-11-06
status: draft
priority: high
owner: migration-team
agents:
  base_profile: .agents/profiles/cloudflare-workers@2025-11-06.md
  catalogs:
    - .agents/catalogs/database-migration.md
    - .agents/catalogs/authentication.md
```

## 1. Overview

### 1.1 Objective
Migrate the cheongram-board project from Supabase (PostgreSQL + Auth) to Cloudflare Workers + D1 (SQLite) for unified infrastructure management and improved performance.

### 1.2 Current State
- **Framework**: Next.js 15.3.5
- **Database**: Supabase PostgreSQL
- **Authentication**: Supabase Auth
- **Deployment**: Configured for Cloudflare Workers (@opennextjs/cloudflare)
- **Main Tables**:
  - `games`: Board game catalog
  - `rentals`: Rental records with relations to games

### 1.3 Target State
- **Framework**: Next.js 15.3.5 (no change)
- **Database**: Cloudflare D1 (SQLite)
- **Authentication**: Cloudflare Access or custom JWT-based auth
- **Deployment**: Cloudflare Workers (existing configuration)

## 2. Behaviour (Given-When-Then)

### AC-1: Database Migration
**Given** the current Supabase PostgreSQL database with games and rentals tables
**When** the migration is executed
**Then** all data should be transferred to Cloudflare D1 with schema compatibility

### AC-2: API Compatibility
**Given** existing API endpoints using Supabase client
**When** the migration is complete
**Then** all API endpoints should function with D1 without breaking changes

### AC-3: Authentication Migration
**Given** current Supabase authentication system
**When** the new authentication is implemented
**Then** admin users should authenticate successfully with equivalent security

### AC-4: Query Performance
**Given** migrated database queries
**When** API endpoints are called
**Then** response times should be equal to or better than Supabase

## 3. Migration Components

### 3.1 Database Layer

#### Schema Translation (PostgreSQL → SQLite)
```sql
-- games table
CREATE TABLE games (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  min_players INTEGER,
  max_players INTEGER,
  play_time INTEGER,
  complexity TEXT,
  description TEXT,
  image_url TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- rentals table
CREATE TABLE rentals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  game_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  rented_at TEXT NOT NULL,
  due_date TEXT NOT NULL,
  returned_at TEXT,
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (game_id) REFERENCES games(id)
);

-- indexes for performance
CREATE INDEX idx_rentals_game_id ON rentals(game_id);
CREATE INDEX idx_rentals_returned_at ON rentals(returned_at);
CREATE INDEX idx_games_title ON games(title);
```

#### Key Differences
| Aspect | PostgreSQL (Supabase) | SQLite (D1) |
|--------|----------------------|-------------|
| Primary Key | SERIAL / BIGSERIAL | INTEGER PRIMARY KEY AUTOINCREMENT |
| Timestamps | timestamptz | TEXT (ISO 8601) |
| Boolean | boolean | INTEGER (0/1) |
| Relations | Native FK with cascades | FK supported but limited |
| Full-text search | Built-in | Requires FTS5 extension |

### 3.2 Query Layer Replacement

#### Current Supabase Pattern
```typescript
const { data, error } = await supabase
  .from("games")
  .select("*, rentals(returned_at, due_date)")
  .eq("id", gameId);
```

#### Target D1 Pattern
```typescript
const result = await env.DB.prepare(
  `SELECT g.*,
    json_group_array(
      json_object('returned_at', r.returned_at, 'due_date', r.due_date)
    ) as rentals
  FROM games g
  LEFT JOIN rentals r ON g.id = r.game_id
  WHERE g.id = ?
  GROUP BY g.id`
).bind(gameId).first();
```

### 3.3 Authentication Strategy

#### Option A: Cloudflare Access (Recommended for admin-only)
- Zero-trust network access
- Email-based authentication
- No code changes needed for auth logic
- Integrated with Cloudflare dashboard

#### Option B: Custom JWT Authentication
- Custom token generation and validation
- Stored in Cloudflare KV or D1
- More flexible user management
- Requires implementation of auth endpoints

**Selected Approach**: Option A (Cloudflare Access) for initial migration, with Option B as future enhancement for user-level auth.

### 3.4 Client Layer Changes

#### Remove Supabase Dependencies
```json
// Remove from package.json
- "@supabase/ssr": "^0.6.1"
- "@supabase/supabase-js": "^2.51.0"
```

#### Add Cloudflare Dependencies
```json
// Add to package.json (if needed)
+ "@cloudflare/workers-types": "^4.x.x"
```

## 4. API Layer Migration Pattern

### 4.1 Database Adapter Pattern
Create abstraction layer to minimize code changes:

```typescript
// src/lib/db/adapter.ts
interface DatabaseAdapter {
  games: {
    list(filters: GameFilters): Promise<Game[]>;
    get(id: number): Promise<Game | null>;
    create(data: CreateGame): Promise<Game>;
    update(id: number, data: UpdateGame): Promise<Game>;
    delete(id: number): Promise<void>;
  };
  rentals: {
    list(filters: RentalFilters): Promise<Rental[]>;
    create(data: CreateRental): Promise<Rental>;
    return(id: number): Promise<Rental>;
    extend(id: number, newDate: string): Promise<Rental>;
  };
}
```

### 4.2 Migration Steps per API Route

For each route in `src/app/api/`:
1. Replace `createClient()` with D1 binding access
2. Convert Supabase queries to raw SQL
3. Update error handling for D1-specific errors
4. Maintain existing validation and business logic
5. Test with equivalent data

## 5. Data Migration Strategy

### 5.1 Export from Supabase
```bash
# Export to CSV/JSON
supabase db dump --data-only > backup.sql
# Or use Supabase API to export as JSON
```

### 5.2 Import to D1
```bash
# Create D1 database
wrangler d1 create cheongram-board-db

# Run schema migration
wrangler d1 execute cheongram-board-db --file=./migrations/schema.sql

# Import data
wrangler d1 execute cheongram-board-db --file=./migrations/data.sql
```

### 5.3 Validation
- Row count verification (games, rentals)
- Spot-check random records
- Verify foreign key integrity
- Test all API endpoints

## 6. Testing Strategy

### 6.1 Unit Tests
```yaml
TEST-migration-001: Schema creation succeeds
TEST-migration-002: Data import completes without errors
TEST-migration-003: Foreign keys are maintained
```

### 6.2 Integration Tests
```yaml
TEST-api-001: GET /api/games returns all games
TEST-api-002: POST /api/games creates new game
TEST-api-003: GET /api/rentals filters correctly
TEST-api-004: POST /api/rentals validates availability
```

### 6.3 Performance Tests
```yaml
TEST-perf-001: Games list loads within 200ms
TEST-perf-002: Rental creation completes within 150ms
TEST-perf-003: Search queries return within 100ms
```

## 7. Rollback Plan

### 7.1 Phase 1: Parallel Run
- Keep Supabase active
- Deploy D1 version to staging
- Compare outputs
- Monitor errors

### 7.2 Phase 2: Gradual Cutover
- Route 10% traffic to D1
- Monitor for 24 hours
- Increase to 50%, then 100%

### 7.3 Emergency Rollback
- Feature flag to switch back to Supabase
- Keep Supabase credentials in environment
- Revert deployment within 5 minutes

## 8. Implementation Phases

### Phase 1: Setup & Schema (1-2 days)
- Create D1 database
- Define schema
- Set up wrangler.toml bindings
- Create database adapter interface

### Phase 2: Data Migration (1 day)
- Export Supabase data
- Transform to SQLite-compatible format
- Import to D1
- Validate data integrity

### Phase 3: API Migration (3-4 days)
- Implement database adapter for D1
- Update API routes one by one
- Update middleware for auth
- Test each endpoint

### Phase 4: Authentication (2-3 days)
- Set up Cloudflare Access
- Update middleware to check CF headers
- Remove Supabase auth logic
- Test admin access

### Phase 5: Testing & Deployment (2-3 days)
- Run full test suite
- Performance benchmarking
- Staging deployment
- Production cutover

## 9. Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Data loss during migration | High | Backup before migration, validation scripts |
| Query performance degradation | Medium | Benchmark before/after, optimize indexes |
| Authentication issues | High | Test thoroughly in staging, keep rollback ready |
| Breaking API changes | High | Maintain API compatibility, use adapter pattern |
| D1 limitations (e.g., relation queries) | Medium | Use raw SQL with JOINs, test complex queries |

## 10. Success Criteria

- [ ] All data migrated with 100% integrity
- [ ] All API endpoints functional
- [ ] Authentication working for admin users
- [ ] Query performance equal to or better than Supabase
- [ ] Zero downtime during cutover
- [ ] All tests passing
- [ ] No critical bugs in first 48 hours

## 11. Tracing

```yaml
trace_links:
  tasks:
    - TASK-migration-001: Setup D1 database
    - TASK-migration-002: Create schema migration
    - TASK-migration-003: Export Supabase data
    - TASK-migration-004: Import to D1
    - TASK-migration-005: Implement database adapter
    - TASK-migration-006: Update API routes
    - TASK-migration-007: Migrate authentication
    - TASK-migration-008: Testing and validation
    - TASK-migration-009: Deployment
  tests:
    - TEST-migration-001 → TEST-migration-003
    - TEST-api-001 → TEST-api-004
    - TEST-perf-001 → TEST-perf-003
  dependencies:
    - wrangler CLI
    - Cloudflare D1 database
    - Cloudflare Workers
```

## 12. References

- [Cloudflare D1 Documentation](https://developers.cloudflare.com/d1/)
- [D1 Migrations Guide](https://developers.cloudflare.com/d1/platform/migrations/)
- [Cloudflare Access Documentation](https://developers.cloudflare.com/cloudflare-one/policies/access/)
- [OpenNext Cloudflare](https://opennext.js.org/cloudflare)
