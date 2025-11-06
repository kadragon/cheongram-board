# Supabase to Cloudflare D1 Migration - Task Plan

```yaml
plan_id: TASK-migration-plan
spec_ref: SPEC-migration-supabase-to-cloudflare-1
created: 2025-11-06
status: pending
estimated_duration: 10-15 days
```

## Phase 1: Setup & Schema (Days 1-2)

### TASK-migration-001: Setup D1 Database
**Priority**: Critical
**Estimated Time**: 2 hours
**Dependencies**: None

**Steps**:
1. Create D1 database via Wrangler CLI
   ```bash
   wrangler d1 create cheongram-board-db
   ```
2. Note the database ID from output
3. Update `wrangler.toml` with D1 binding:
   ```toml
   [[d1_databases]]
   binding = "DB"
   database_name = "cheongram-board-db"
   database_id = "<YOUR_DATABASE_ID>"
   ```
4. Test local D1 connection:
   ```bash
   wrangler d1 execute cheongram-board-db --local --command="SELECT 1"
   ```

**Validation**:
- [ ] D1 database created successfully
- [ ] Database ID added to wrangler.toml
- [ ] Local connection test passes
- [ ] Remote connection test passes

**Trace**: SPEC-migration-supabase-to-cloudflare-1 → AC-1

---

### TASK-migration-002: Create Schema Migration
**Priority**: Critical
**Estimated Time**: 3 hours
**Dependencies**: TASK-migration-001

**Steps**:
1. Create migrations directory:
   ```bash
   mkdir -p migrations
   ```

2. Export current Supabase schema:
   ```bash
   # Via Supabase dashboard or CLI
   supabase db dump --schema-only > migrations/supabase_schema.sql
   ```

3. Create `migrations/0001_initial_schema.sql`:
   ```sql
   -- Migration: Initial schema for cheongram-board
   -- Date: 2025-11-06

   CREATE TABLE IF NOT EXISTS games (
     id INTEGER PRIMARY KEY AUTOINCREMENT,
     title TEXT NOT NULL,
     min_players INTEGER,
     max_players INTEGER,
     play_time INTEGER,
     complexity TEXT CHECK(complexity IN ('low', 'medium', 'high')),
     description TEXT,
     image_url TEXT,
     created_at TEXT DEFAULT (datetime('now')),
     updated_at TEXT DEFAULT (datetime('now'))
   );

   CREATE TABLE IF NOT EXISTS rentals (
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
     FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE
   );

   CREATE INDEX IF NOT EXISTS idx_rentals_game_id ON rentals(game_id);
   CREATE INDEX IF NOT EXISTS idx_rentals_returned_at ON rentals(returned_at);
   CREATE INDEX IF NOT EXISTS idx_rentals_active ON rentals(game_id, returned_at) WHERE returned_at IS NULL;
   CREATE INDEX IF NOT EXISTS idx_games_title ON games(title);
   ```

4. Apply schema to local D1:
   ```bash
   wrangler d1 execute cheongram-board-db --local --file=migrations/0001_initial_schema.sql
   ```

5. Apply schema to remote D1:
   ```bash
   wrangler d1 execute cheongram-board-db --file=migrations/0001_initial_schema.sql
   ```

**Validation**:
- [ ] migrations/ directory created
- [ ] Schema file created with all tables
- [ ] Indexes defined correctly
- [ ] Foreign keys configured
- [ ] Schema applied to local D1
- [ ] Schema applied to remote D1
- [ ] Tables visible in D1 dashboard

**Trace**: SPEC-migration-supabase-to-cloudflare-1 → AC-1

---

### TASK-migration-003: Create Database Adapter Interface
**Priority**: High
**Estimated Time**: 4 hours
**Dependencies**: TASK-migration-002

**Steps**:
1. Create `src/lib/db/types.ts` with shared types:
   ```typescript
   export interface Game {
     id: number;
     title: string;
     min_players: number | null;
     max_players: number | null;
     play_time: number | null;
     complexity: 'low' | 'medium' | 'high' | null;
     description: string | null;
     image_url: string | null;
     created_at: string;
     updated_at: string;
     is_rented?: boolean;
     return_date?: string | null;
   }

   export interface Rental {
     id: number;
     game_id: number;
     name: string;
     email: string | null;
     phone: string | null;
     rented_at: string;
     due_date: string;
     returned_at: string | null;
     notes: string | null;
     created_at: string;
     updated_at: string;
     games?: Game;
   }

   export interface GameFilters {
     query?: string;
     min_players?: number;
     max_players?: number;
     min_play_time?: number;
     max_play_time?: number;
     complexity?: string;
     availability?: 'available' | 'rented';
     sort_by?: string;
     sort_order?: 'asc' | 'desc';
     page?: number;
     limit?: number;
   }

   export interface RentalFilters {
     query?: string;
     game_id?: number;
     status?: 'active' | 'returned' | 'overdue';
     date_from?: string;
     date_to?: string;
     sort_by?: string;
     sort_order?: 'asc' | 'desc';
     page?: number;
     limit?: number;
   }
   ```

2. Create `src/lib/db/d1-adapter.ts`:
   ```typescript
   import { D1Database } from '@cloudflare/workers-types';
   import { Game, Rental, GameFilters, RentalFilters } from './types';

   export class D1Adapter {
     constructor(private db: D1Database) {}

     async listGames(filters: GameFilters): Promise<{ games: Game[]; total: number }> {
       // Implementation
     }

     async getGame(id: number): Promise<Game | null> {
       // Implementation
     }

     async createGame(data: Partial<Game>): Promise<Game> {
       // Implementation
     }

     async updateGame(id: number, data: Partial<Game>): Promise<Game> {
       // Implementation
     }

     async deleteGame(id: number): Promise<void> {
       // Implementation
     }

     async listRentals(filters: RentalFilters): Promise<{ rentals: Rental[]; total: number }> {
       // Implementation
     }

     async createRental(data: Partial<Rental>): Promise<Rental> {
       // Implementation
     }

     async returnRental(id: number): Promise<Rental> {
       // Implementation
     }

     async extendRental(id: number, newDueDate: string): Promise<Rental> {
       // Implementation
     }
   }
   ```

3. Write unit tests for adapter
4. Document adapter usage

**Validation**:
- [ ] Type definitions created
- [ ] D1Adapter class implemented
- [ ] All CRUD methods defined
- [ ] Unit tests written and passing
- [ ] Documentation complete

**Trace**: SPEC-migration-supabase-to-cloudflare-1 → AC-2

---

## Phase 2: Data Migration (Day 3)

### TASK-migration-004: Export Supabase Data
**Priority**: Critical
**Estimated Time**: 2 hours
**Dependencies**: TASK-migration-002

**Steps**:
1. Create export script `scripts/export-supabase.ts`:
   ```typescript
   import { createClient } from '@supabase/supabase-js';
   import fs from 'fs';

   const supabase = createClient(
     process.env.NEXT_PUBLIC_SUPABASE_URL!,
     process.env.SUPABASE_SERVICE_KEY! // Use service key for full access
   );

   async function exportData() {
     // Export games
     const { data: games, error: gamesError } = await supabase
       .from('games')
       .select('*')
       .order('id');

     if (gamesError) throw gamesError;

     // Export rentals
     const { data: rentals, error: rentalsError } = await supabase
       .from('rentals')
       .select('*')
       .order('id');

     if (rentalsError) throw rentalsError;

     // Save to JSON
     fs.writeFileSync('migrations/data/games.json', JSON.stringify(games, null, 2));
     fs.writeFileSync('migrations/data/rentals.json', JSON.stringify(rentals, null, 2));

     console.log(`Exported ${games.length} games and ${rentals.length} rentals`);
   }

   exportData();
   ```

2. Create migrations/data directory:
   ```bash
   mkdir -p migrations/data
   ```

3. Run export:
   ```bash
   npx tsx scripts/export-supabase.ts
   ```

4. Verify exported data:
   - Check games.json
   - Check rentals.json
   - Verify counts match Supabase

**Validation**:
- [ ] Export script created
- [ ] Data directory created
- [ ] Games exported successfully
- [ ] Rentals exported successfully
- [ ] Row counts verified
- [ ] Data integrity checked (no nulls in required fields)

**Trace**: SPEC-migration-supabase-to-cloudflare-1 → AC-1

---

### TASK-migration-005: Transform and Import Data to D1
**Priority**: Critical
**Estimated Time**: 3 hours
**Dependencies**: TASK-migration-004

**Steps**:
1. Create data transformation script `scripts/transform-data.ts`:
   ```typescript
   import fs from 'fs';

   function transformGame(game: any) {
     return {
       ...game,
       // Convert timestamps to ISO 8601 strings
       created_at: new Date(game.created_at).toISOString().replace('T', ' ').substring(0, 19),
       updated_at: new Date(game.updated_at).toISOString().replace('T', ' ').substring(0, 19),
     };
   }

   function transformRental(rental: any) {
     return {
       ...rental,
       rented_at: rental.rented_at, // Already in correct format
       due_date: rental.due_date,
       returned_at: rental.returned_at,
       created_at: new Date(rental.created_at).toISOString().replace('T', ' ').substring(0, 19),
       updated_at: new Date(rental.updated_at).toISOString().replace('T', ' ').substring(0, 19),
     };
   }

   const games = JSON.parse(fs.readFileSync('migrations/data/games.json', 'utf-8'));
   const rentals = JSON.parse(fs.readFileSync('migrations/data/rentals.json', 'utf-8'));

   const transformedGames = games.map(transformGame);
   const transformedRentals = rentals.map(transformRental);

   fs.writeFileSync('migrations/data/games_transformed.json', JSON.stringify(transformedGames, null, 2));
   fs.writeFileSync('migrations/data/rentals_transformed.json', JSON.stringify(transformedRentals, null, 2));
   ```

2. Create SQL insert script generator `scripts/generate-inserts.ts`:
   ```typescript
   import fs from 'fs';

   function escapeSQL(value: any): string {
     if (value === null || value === undefined) return 'NULL';
     if (typeof value === 'number') return String(value);
     return `'${String(value).replace(/'/g, "''")}'`;
   }

   function generateInserts(table: string, records: any[]): string {
     const lines = records.map(record => {
       const columns = Object.keys(record).join(', ');
       const values = Object.values(record).map(escapeSQL).join(', ');
       return `INSERT INTO ${table} (${columns}) VALUES (${values});`;
     });
     return lines.join('\n');
   }

   const games = JSON.parse(fs.readFileSync('migrations/data/games_transformed.json', 'utf-8'));
   const rentals = JSON.parse(fs.readFileSync('migrations/data/rentals_transformed.json', 'utf-8'));

   const sql = [
     '-- Data migration for cheongram-board',
     '-- Date: 2025-11-06',
     '',
     'BEGIN TRANSACTION;',
     '',
     '-- Insert games',
     generateInserts('games', games),
     '',
     '-- Insert rentals',
     generateInserts('rentals', rentals),
     '',
     'COMMIT;',
   ].join('\n');

   fs.writeFileSync('migrations/0002_import_data.sql', sql);
   ```

3. Run transformation and generation:
   ```bash
   npx tsx scripts/transform-data.ts
   npx tsx scripts/generate-inserts.ts
   ```

4. Import to local D1:
   ```bash
   wrangler d1 execute cheongram-board-db --local --file=migrations/0002_import_data.sql
   ```

5. Verify data in local D1:
   ```bash
   wrangler d1 execute cheongram-board-db --local --command="SELECT COUNT(*) FROM games"
   wrangler d1 execute cheongram-board-db --local --command="SELECT COUNT(*) FROM rentals"
   ```

6. If validation passes, import to remote D1:
   ```bash
   wrangler d1 execute cheongram-board-db --file=migrations/0002_import_data.sql
   ```

**Validation**:
- [ ] Transformation script created
- [ ] Insert generation script created
- [ ] Data transformed successfully
- [ ] SQL insert file generated
- [ ] Local D1 import successful
- [ ] Row counts match source data
- [ ] Sample records verified
- [ ] Foreign key integrity maintained
- [ ] Remote D1 import successful

**Trace**: SPEC-migration-supabase-to-cloudflare-1 → AC-1

---

## Phase 3: API Migration (Days 4-7)

### TASK-migration-006: Implement D1 Adapter Methods
**Priority**: High
**Estimated Time**: 8 hours
**Dependencies**: TASK-migration-003, TASK-migration-005

**Steps**:
1. Implement `listGames()` in D1Adapter
2. Implement `getGame()` with rentals relation
3. Implement `createGame()`
4. Implement `updateGame()`
5. Implement `deleteGame()`
6. Implement `listRentals()` with games relation
7. Implement `createRental()` with availability check
8. Implement `returnRental()`
9. Implement `extendRental()`
10. Write integration tests for each method
11. Test with local D1

**Validation**:
- [ ] All adapter methods implemented
- [ ] SQL queries use prepared statements
- [ ] Proper error handling in place
- [ ] Integration tests written
- [ ] All tests passing with local D1
- [ ] Query performance acceptable

**Trace**: SPEC-migration-supabase-to-cloudflare-1 → AC-2, AC-4

---

### TASK-migration-007: Update Games API Routes
**Priority**: High
**Estimated Time**: 4 hours
**Dependencies**: TASK-migration-006

**Steps**:
1. Update `src/app/api/games/route.ts`:
   - Replace Supabase client with D1 adapter
   - Maintain existing validation and error handling
   - Preserve response format

2. Update `src/app/api/games/[id]/route.ts`:
   - Implement GET, PUT, DELETE with D1 adapter

3. Test locally:
   ```bash
   npm run dev
   # Test all endpoints
   curl http://localhost:3000/api/games
   curl http://localhost:3000/api/games/1
   ```

4. Write integration tests

**Validation**:
- [ ] Games GET /api/games functional
- [ ] Games POST /api/games functional
- [ ] Games GET /api/games/[id] functional
- [ ] Games PUT /api/games/[id] functional
- [ ] Games DELETE /api/games/[id] functional
- [ ] Search filters working
- [ ] Pagination working
- [ ] Sorting working
- [ ] Response format unchanged
- [ ] Integration tests passing

**Trace**: SPEC-migration-supabase-to-cloudflare-1 → AC-2

---

### TASK-migration-008: Update Rentals API Routes
**Priority**: High
**Estimated Time**: 4 hours
**Dependencies**: TASK-migration-006

**Steps**:
1. Update `src/app/api/rentals/route.ts`
2. Update `src/app/api/rentals/[id]/route.ts`
3. Update `src/app/api/rentals/[id]/return/route.ts`
4. Update `src/app/api/rentals/[id]/extend/route.ts`
5. Test all rental operations
6. Write integration tests

**Validation**:
- [ ] Rentals GET /api/rentals functional
- [ ] Rentals POST /api/rentals functional
- [ ] Rentals GET /api/rentals/[id] functional
- [ ] Rentals PUT /api/rentals/[id] functional
- [ ] Return rental functional
- [ ] Extend rental functional
- [ ] Availability check working
- [ ] Status filters working
- [ ] Integration tests passing

**Trace**: SPEC-migration-supabase-to-cloudflare-1 → AC-2

---

### TASK-migration-009: Update Scrape API Route (if needed)
**Priority**: Medium
**Estimated Time**: 1 hour
**Dependencies**: TASK-migration-006

**Steps**:
1. Check if `src/app/api/scrape/route.ts` uses Supabase
2. If yes, update to use D1 adapter
3. Test scraping functionality

**Validation**:
- [ ] Scrape endpoint functional (if applicable)
- [ ] Data saved to D1 correctly

**Trace**: SPEC-migration-supabase-to-cloudflare-1 → AC-2

---

## Phase 4: Authentication Migration (Days 8-10)

### TASK-migration-010: Implement Cloudflare Access Authentication
**Priority**: Critical
**Estimated Time**: 4 hours
**Dependencies**: None (can run in parallel)

**Steps**:
1. Create `src/lib/auth/cloudflare-access.ts`:
   ```typescript
   export function getAuthenticatedUser(request: Request): string | null {
     return request.headers.get('CF-Access-Authenticated-User-Email');
   }

   export function requireAuth(request: Request): string {
     const email = getAuthenticatedUser(request);
     if (!email) {
       throw new Error('Unauthorized');
     }
     return email;
   }

   export function isAdmin(email: string): boolean {
     const adminEmails = (process.env.ADMIN_EMAILS || '').split(',');
     return adminEmails.includes(email);
   }

   export function requireAdmin(request: Request): string {
     const email = requireAuth(request);
     if (!isAdmin(email)) {
       throw new Error('Forbidden');
     }
     return email;
   }
   ```

2. Create `src/middleware.ts`:
   ```typescript
   import { NextResponse } from 'next/server';
   import type { NextRequest } from 'next/server';

   export function middleware(request: NextRequest) {
     // For API routes, check Cloudflare Access header
     if (request.nextUrl.pathname.startsWith('/api/')) {
       const email = request.headers.get('CF-Access-Authenticated-User-Email');

       // In development, allow without CF header
       if (process.env.NODE_ENV === 'development') {
         const devEmail = process.env.DEV_ADMIN_EMAIL || 'dev@localhost';
         const response = NextResponse.next();
         response.headers.set('X-User-Email', devEmail);
         return response;
       }

       if (!email) {
         return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
       }

       // Check admin status
       const adminEmails = (process.env.ADMIN_EMAILS || '').split(',');
       if (!adminEmails.includes(email)) {
         return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
       }

       // Add user email to request headers
       const response = NextResponse.next();
       response.headers.set('X-User-Email', email);
       return response;
     }

     return NextResponse.next();
   }

   export const config = {
     matcher: '/api/:path*',
   };
   ```

3. Update `src/utils/auth.ts`:
   - Remove Supabase auth logic
   - Use new Cloudflare Access utilities

**Validation**:
- [ ] Auth utilities created
- [ ] Middleware updated
- [ ] Development mode works without CF headers
- [ ] Production mode requires CF headers
- [ ] Admin check functional
- [ ] Unit tests written and passing

**Trace**: SPEC-migration-supabase-to-cloudflare-1 → AC-3

---

### TASK-migration-011: Update API Routes to Use New Auth
**Priority**: High
**Estimated Time**: 3 hours
**Dependencies**: TASK-migration-010

**Steps**:
1. Update all API routes to use new auth:
   ```typescript
   // Before
   const supabase = createClient();
   if (!await checkAdmin(supabase)) {
     return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
   }

   // After
   import { requireAdmin } from '@/lib/auth/cloudflare-access';
   const adminEmail = requireAdmin(request);
   ```

2. Remove Supabase auth calls from:
   - src/app/api/games/route.ts
   - src/app/api/rentals/route.ts
   - Other protected routes

3. Test authentication in development
4. Write integration tests

**Validation**:
- [ ] All routes updated
- [ ] Supabase auth removed
- [ ] Development testing passes
- [ ] Integration tests pass
- [ ] Unauthorized requests rejected
- [ ] Admin emails accepted

**Trace**: SPEC-migration-supabase-to-cloudflare-1 → AC-3

---

### TASK-migration-012: Configure Cloudflare Access (Production)
**Priority**: Critical
**Estimated Time**: 2 hours
**Dependencies**: TASK-migration-011

**Steps**:
1. Login to Cloudflare Dashboard
2. Navigate to Zero Trust > Access > Applications
3. Click "Add an application"
4. Select "Self-hosted"
5. Configure:
   - Application name: "청람보드"
   - Session duration: 24 hours
   - Application domain: crb.kadragon.work
6. Add identity provider (Google, GitHub, or email OTP)
7. Create access policy:
   - Policy name: "Admin Access"
   - Rule: Include emails in list
   - Add admin email addresses
8. Save and test

**Validation**:
- [ ] Cloudflare Access application created
- [ ] Identity provider configured
- [ ] Access policy created
- [ ] Admin emails added
- [ ] Access tested successfully
- [ ] Non-admin access denied

**Trace**: SPEC-migration-supabase-to-cloudflare-1 → AC-3

---

### TASK-migration-013: Remove Supabase Dependencies
**Priority**: High
**Estimated Time**: 1 hour
**Dependencies**: TASK-migration-011

**Steps**:
1. Remove Supabase utility files:
   ```bash
   rm src/utils/supabase/server.ts
   rm src/utils/supabase/client.ts
   rm src/utils/supabase/middleware.ts
   rmdir src/utils/supabase
   ```

2. Update package.json:
   ```bash
   npm uninstall @supabase/ssr @supabase/supabase-js
   ```

3. Remove environment variables from .env:
   - NEXT_PUBLIC_SUPABASE_URL
   - NEXT_PUBLIC_SUPABASE_ANON_KEY

4. Update .env.example:
   ```
   # Remove Supabase vars
   # Add
   ADMIN_EMAILS="admin@example.com,admin2@example.com"
   DEV_ADMIN_EMAIL="dev@localhost"
   ```

5. Search codebase for any remaining Supabase references:
   ```bash
   grep -r "supabase" src/
   grep -r "@supabase" src/
   ```

**Validation**:
- [ ] Supabase files removed
- [ ] Supabase packages uninstalled
- [ ] Environment variables removed
- [ ] No remaining Supabase references
- [ ] Build succeeds
- [ ] Tests pass

**Trace**: SPEC-migration-supabase-to-cloudflare-1 → AC-2, AC-3

---

## Phase 5: Testing & Deployment (Days 11-15)

### TASK-migration-014: Comprehensive Testing
**Priority**: Critical
**Estimated Time**: 8 hours
**Dependencies**: All previous tasks

**Steps**:
1. Run unit tests:
   ```bash
   npm test
   ```

2. Run integration tests:
   ```bash
   npm test -- --testPathPattern=integration
   ```

3. Manual testing checklist:
   - [ ] List all games
   - [ ] Search games by title
   - [ ] Filter games by players
   - [ ] Filter games by complexity
   - [ ] Filter games by availability
   - [ ] Sort games by various fields
   - [ ] Paginate through games
   - [ ] Create new game
   - [ ] Update game
   - [ ] Delete game
   - [ ] List all rentals
   - [ ] Filter rentals by status
   - [ ] Create new rental
   - [ ] Check game availability validation
   - [ ] Return rental
   - [ ] Extend rental
   - [ ] Authentication works
   - [ ] Admin access works
   - [ ] Non-admin access denied

4. Performance testing:
   - Measure response times for all endpoints
   - Compare with Supabase baseline
   - Identify slow queries
   - Optimize as needed

5. Load testing (optional):
   ```bash
   # Use tool like k6 or Artillery
   k6 run load-test.js
   ```

**Validation**:
- [ ] All unit tests passing
- [ ] All integration tests passing
- [ ] Manual test checklist complete
- [ ] Performance metrics acceptable
- [ ] No critical bugs found
- [ ] Load testing results acceptable (if performed)

**Trace**: SPEC-migration-supabase-to-cloudflare-1 → AC-2, AC-3, AC-4

---

### TASK-migration-015: Documentation Update
**Priority**: Medium
**Estimated Time**: 4 hours
**Dependencies**: TASK-migration-014

**Steps**:
1. Update README.md:
   - Remove Supabase setup instructions
   - Add D1 setup instructions
   - Add Cloudflare Access setup
   - Update deployment instructions

2. Create MIGRATION.md:
   - Document migration process
   - Note any breaking changes
   - Provide rollback instructions

3. Update API documentation (if exists)

4. Update developer setup guide

**Validation**:
- [ ] README.md updated
- [ ] MIGRATION.md created
- [ ] API docs updated
- [ ] Developer guide updated
- [ ] All links working

**Trace**: SPEC-migration-supabase-to-cloudflare-1

---

### TASK-migration-016: Staging Deployment
**Priority**: Critical
**Estimated Time**: 3 hours
**Dependencies**: TASK-migration-014

**Steps**:
1. Create staging environment in wrangler.toml:
   ```toml
   [env.staging]
   name = "cheongram-board-staging"

   [[env.staging.d1_databases]]
   binding = "DB"
   database_name = "cheongram-board-db-staging"
   database_id = "<STAGING_DATABASE_ID>"
   ```

2. Create staging D1 database:
   ```bash
   wrangler d1 create cheongram-board-db-staging
   ```

3. Apply migrations to staging:
   ```bash
   wrangler d1 execute cheongram-board-db-staging --file=migrations/0001_initial_schema.sql
   wrangler d1 execute cheongram-board-db-staging --file=migrations/0002_import_data.sql
   ```

4. Deploy to staging:
   ```bash
   npm run build
   wrangler deploy --env staging
   ```

5. Configure Cloudflare Access for staging domain

6. Test staging deployment thoroughly

**Validation**:
- [ ] Staging environment configured
- [ ] Staging database created and populated
- [ ] Staging deployment successful
- [ ] Staging accessible via Cloudflare Access
- [ ] All API endpoints working in staging
- [ ] No errors in staging logs

**Trace**: SPEC-migration-supabase-to-cloudflare-1

---

### TASK-migration-017: Production Deployment
**Priority**: Critical
**Estimated Time**: 2 hours
**Dependencies**: TASK-migration-016

**Steps**:
1. Final pre-deployment checklist:
   - [ ] All tests passing
   - [ ] Staging tested and approved
   - [ ] Rollback plan ready
   - [ ] Team notified
   - [ ] Monitoring in place

2. Schedule deployment (recommend low-traffic time)

3. Deploy to production:
   ```bash
   npm run build
   npm run deploy
   ```

4. Verify deployment:
   - [ ] Application accessible
   - [ ] Cloudflare Access working
   - [ ] API endpoints responding
   - [ ] Database queries working
   - [ ] No errors in logs

5. Monitor for issues:
   - Watch Cloudflare Analytics
   - Check application logs
   - Monitor error rates
   - Check response times

6. If issues arise, execute rollback plan

**Validation**:
- [ ] Production deployment successful
- [ ] All functionality working
- [ ] No critical errors
- [ ] Performance acceptable
- [ ] Monitoring active
- [ ] Team notified of completion

**Trace**: SPEC-migration-supabase-to-cloudflare-1

---

### TASK-migration-018: Post-Deployment Monitoring
**Priority**: High
**Estimated Time**: Ongoing (48 hours)
**Dependencies**: TASK-migration-017

**Steps**:
1. Monitor for 48 hours:
   - Check error rates every 4 hours
   - Review response time metrics
   - Check database performance
   - Monitor user feedback

2. Document any issues and resolutions

3. Fine-tune as needed:
   - Optimize slow queries
   - Adjust indexes
   - Update documentation

4. After 48 hours, if stable:
   - Decommission Supabase (optional)
   - Archive migration artifacts
   - Update runbooks

**Validation**:
- [ ] No critical issues in 48 hours
- [ ] Performance stable
- [ ] Error rate acceptable
- [ ] User feedback positive
- [ ] Documentation complete

**Trace**: SPEC-migration-supabase-to-cloudflare-1

---

## Rollback Plan

### Emergency Rollback to Supabase

**If critical issues occur in production:**

1. **Immediate Steps** (< 5 minutes):
   ```bash
   # Revert to previous deployment
   git revert <migration-commit-hash>
   npm run deploy
   ```

2. **Re-enable Supabase**:
   - Restore .env with Supabase credentials
   - Reinstall Supabase packages: `npm install @supabase/ssr @supabase/supabase-js`
   - Deploy: `npm run deploy`

3. **Notify Users**:
   - Post status update
   - Explain issue and resolution timeline

4. **Post-Mortem**:
   - Document what went wrong
   - Update migration plan
   - Schedule retry with fixes

**Data Sync** (if needed):
- Export data from D1
- Import to Supabase
- Verify data integrity

---

## Success Metrics

After migration completion, verify:
- [ ] All data migrated (100% row count match)
- [ ] All API endpoints functional
- [ ] Authentication working
- [ ] P95 response time ≤ 150ms
- [ ] Zero downtime during cutover
- [ ] All tests passing
- [ ] No critical bugs in first 48 hours
- [ ] User satisfaction maintained or improved

---

## Communication Plan

### Stakeholders to Notify:
- Development team
- Admin users
- End users (if applicable)

### Timeline:
- **T-7 days**: Notify of upcoming migration
- **T-1 day**: Remind of migration schedule
- **T-0**: Migration in progress (status updates)
- **T+1 hour**: Migration complete notification
- **T+48 hours**: Success confirmation or rollback

### Status Updates:
- Use project communication channel
- Post updates at key milestones
- Report any issues immediately

---

## Notes and Assumptions

1. **Database Size**: Assuming < 10k records total (manageable for single migration)
2. **Downtime**: Targeting zero downtime with parallel run approach
3. **Supabase Retention**: Keep Supabase active for 30 days as safety net
4. **Testing Environment**: Staging environment mirrors production
5. **Admin Users**: Small number of admin users (email-based auth sufficient)
6. **API Clients**: Assuming no external API clients (all access via web UI)

---

## Resources

### Documentation
- [Cloudflare D1 Docs](https://developers.cloudflare.com/d1/)
- [Wrangler CLI Reference](https://developers.cloudflare.com/workers/wrangler/)
- [Cloudflare Access Setup](https://developers.cloudflare.com/cloudflare-one/policies/access/)
- [OpenNext Cloudflare](https://opennext.js.org/cloudflare)

### Tools
- Wrangler CLI
- Node.js/TypeScript
- Jest for testing
- Cloudflare Dashboard

### Support
- Cloudflare Discord: https://discord.gg/cloudflaredev
- Internal team contact

---

**Plan Status**: READY FOR REVIEW
**Next Step**: Get approval, then begin TASK-migration-001
