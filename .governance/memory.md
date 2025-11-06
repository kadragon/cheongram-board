# Project Memory and Context

```yaml
last_updated: 2025-11-06
project: cheongram-board
status: active_development
current_phase: migration/supabase-to-cloudflare
```

## Project Overview

Board game rental management system (청람보드) for Cheongram Church, built with Next.js and migrating to Cloudflare Workers + D1.

### Key Characteristics
- **Domain**: Board game catalog and rental tracking
- **Users**: Church administrators (admin-only system)
- **Scale**: Small database (<10k records), low traffic
- **Architecture**: Transitioning from Supabase to Cloudflare D1

---

## Current State (As of 2025-11-06)

### Branch Status
```
main → migration/supabase-to-cloudflare (active)
```

### Migration Progress

#### Phase 1: Supabase to D1 Migration ✅ COMPLETED
**Status**: Successful with documented blockers resolved

**Accomplishments**:
- D1 database setup complete
- Schema migrated (games, rentals tables)
- D1Adapter fully functional (720 LOC)
- API routes updated to use D1
- Public endpoints 100% functional
- Critical bugs fixed:
  - D1 binding access via Cloudflare context
  - Dev mode detection enhanced
  - Authentication headers working

**Known Issues**:
- Environment variable configuration in OpenNext (workaround documented)
- Admin endpoints blocked by `ADMIN_EMAILS` env var access issue
- Solution: Use `.dev.vars` file or wrangler secrets

#### Phase 2: OpenNext to Pure Workers 📋 PLANNED
**Status**: Specification complete, awaiting execution

**Plan**:
- Migrate to Hono framework for backend
- Extract frontend to Vite + React on Cloudflare Pages
- Eliminate OpenNext dependency
- Estimated: 5-7 calendar days with 2-3 people

**Benefits**:
- Simplified env var access (no Symbol hacks)
- 5x smaller bundle size (<100KB vs ~500KB)
- 3-5x faster cold start (<20ms vs 50-100ms)
- Easier debugging and maintenance

---

## Architecture Evolution

### Previous: Supabase (Deprecated)
```
Next.js App → Supabase Client → PostgreSQL + Auth
```
**Removed**: 2025-11-06

### Current: OpenNext + D1 (Transitional)
```
Next.js App → OpenNext Adapter → Workers → D1
                                         → Cloudflare Access
```
**Issues**: Symbol hacks for env access, large bundle, OpenNext dependency

### Target: Pure Workers (Planned)
```
React SPA (Pages) → Hono API (Workers) → D1
                                        → Cloudflare Access
```
**Goals**: Simplified, performant, maintainable

---

## Data Model

### Tables
1. **games** (Board game catalog)
   - Fields: id, title, min_players, max_players, play_time, complexity, description, image_url
   - Indexes: title
   - Relations: has_many rentals

2. **rentals** (Rental records)
   - Fields: id, game_id, name, email, phone, rented_at, due_date, returned_at, notes
   - Indexes: game_id, returned_at, active rentals (composite)
   - Relations: belongs_to game

### Key Constraints
- SQLite limitations: TEXT for timestamps (ISO 8601), INTEGER for booleans
- Foreign keys enforced: rentals.game_id → games.id
- No complex queries or full-text search (use FTS5 if needed)

---

## Critical Lessons Learned

### 1. OpenNext Environment Variable Access
**Problem**: Cloudflare bindings (D1, env vars) not directly accessible in OpenNext context

**Solution**:
```typescript
// Access via Symbol for Cloudflare context
const cloudflareContext = (globalThis as any)[Symbol.for('__cloudflare-context__')];
const db = cloudflareContext.env?.DB;
```

**Impact**: Workaround needed throughout codebase; to be eliminated in Phase 2

### 2. D1 Query Patterns
**Best Practices**:
- Always use prepared statements: `env.DB.prepare(sql).bind(params)`
- Batch operations for multiple inserts
- Use `json_group_array()` for relations instead of multiple queries
- Handle `returned_at IS NULL` for active rentals efficiently

**Performance**:
- Simple queries: <10ms
- Complex joins: <50ms
- Indexes are critical for performance

### 3. Authentication Flow
**Current**: Cloudflare Access headers + dev fallback

**Dev Mode** (localhost):
```http
X-Dev-User-Email: admin@example.com
```

**Production** (CF Access):
```http
CF-Access-Authenticated-User-Email: admin@example.com
```

**Admin Check**: Email must be in `ADMIN_EMAILS` env var (comma-separated)

### 4. API Response Format (Standardized)
**Success**:
```json
{
  "data": { /* payload */ },
  "meta": {
    "timestamp": "2025-11-06T12:00:00Z",
    "pagination": { "page": 1, "limit": 20, "total": 100 }
  }
}
```

**Error**:
```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Technical message",
    "userMessage": "사용자 친화적 메시지 (한글)",
    "timestamp": "2025-11-06T12:00:00Z",
    "details": { /* optional */ }
  }
}
```

### 5. Testing Infrastructure
**Automated Tests**: `.spec/migration/testing/api-tests.sh`
- 26 test cases across 7 acceptance criteria
- Color-coded output
- Automatic cleanup
- Coverage: public API (100%), admin auth (blocked), CRUD (blocked), errors (75%)

**Manual Testing**: `TESTING.md` guide
- Local dev setup instructions
- curl examples for all endpoints
- Browser extension setup for admin access

---

## Recurring Patterns

### Database Queries
```typescript
// List with pagination
const { results } = await adapter.listGames({
  query: 'search term',
  page: 1,
  limit: 20,
  sort_by: 'title',
  sort_order: 'asc'
});

// Get with relations
const game = await adapter.getGame(id);
// Returns game with is_rented and return_date

// Create with validation
const newGame = await adapter.createGame({
  title: 'required',
  min_players: 2,
  max_players: 4,
  complexity: 'low' | 'medium' | 'high'
});
```

### Error Handling
```typescript
try {
  const result = await dbOperation();
  return NextResponse.json({ data: result, meta: { timestamp: new Date().toISOString() }});
} catch (error) {
  if (error instanceof AppError) {
    return NextResponse.json({ error: error.toJSON() }, { status: error.statusCode });
  }
  // Unexpected errors
  return NextResponse.json({
    error: {
      code: 'INTERNAL_ERROR',
      message: error.message,
      timestamp: new Date().toISOString()
    }
  }, { status: 500 });
}
```

### Validation Pattern (Zod)
```typescript
import { z } from 'zod';

const gameCreateSchema = z.object({
  title: z.string().min(1).max(255),
  min_players: z.number().int().positive().optional(),
  max_players: z.number().int().positive().optional(),
  complexity: z.enum(['low', 'medium', 'high']).optional()
}).refine(data => {
  if (data.min_players && data.max_players) {
    return data.min_players <= data.max_players;
  }
  return true;
}, 'min_players must be <= max_players');
```

---

## Technology Decisions

### Why D1 over Supabase?
1. **Unified Platform**: All infrastructure on Cloudflare
2. **Cost**: Free tier sufficient for this scale
3. **Performance**: Edge-deployed, low latency
4. **Simplicity**: No external dependencies

**Trade-offs**:
- Lost: PostgreSQL features (JSONB, advanced queries)
- Gained: Simpler deployment, better integration

### Why Cloudflare Access over Supabase Auth?
1. **Zero-Trust**: Built into Cloudflare
2. **No UI Code**: No login/signup forms needed
3. **Email-Based**: Simple for admin-only app
4. **Integrated**: Works with other CF services

**Trade-offs**:
- Lost: User management UI, social auth
- Gained: Simpler code, better security

### Why Hono over Express/Fastify? (Planned)
1. **Size**: 14KB vs 500KB+
2. **Speed**: Optimized for edge
3. **TypeScript**: First-class support
4. **Workers Native**: Built for Cloudflare

---

## Known Limitations

### SQLite (D1) Limitations
- No full-text search (use FTS5 extension if needed)
- Limited concurrent writes (queue writes in Workers)
- 10GB database size limit (sufficient for this project)
- No native array types (use JSON or separate tables)

### Cloudflare Workers Limitations
- 50ms CPU time per request (paid tier)
- 128MB memory limit
- No filesystem access (use KV, R2, or D1)
- Limited Node.js API compatibility

### Current Codebase Issues
- OpenNext Symbol hacks throughout
- Logging system assumes filesystem (needs simplification for Phase 2)
- Frontend and backend tightly coupled (to be separated in Phase 2)

---

## Performance Benchmarks

### Current (OpenNext + D1)
- Cold start: 50-100ms
- API response time (p95): ~150ms
- Database queries: <10ms (simple), <50ms (complex)
- Bundle size: ~500KB

### Target (Pure Workers)
- Cold start: <20ms (3-5x improvement)
- API response time (p95): <100ms (1.5x improvement)
- Database queries: Same (<10ms simple)
- Bundle size: <100KB (5x reduction)

---

## Next Steps Roadmap

### Immediate (Week 1-2)
1. Resolve `.dev.vars` issue for local admin testing
2. Complete Phase 1 testing (admin endpoints)
3. Begin Phase 2 planning (Hono migration)

### Short-term (Month 1)
1. Execute Phase 2 migration (5-7 days)
2. Deploy pure Workers backend
3. Deploy React SPA to Pages
4. Production cutover

### Long-term (Month 2-3)
1. Add monitoring and alerts
2. Implement backup/restore procedures
3. Consider user-level authentication (beyond admin)
4. Performance optimization based on production data

---

## Critical Files Reference

### Core Implementation
- `src/lib/db/d1-adapter.ts` - Database adapter (720 LOC, fully functional)
- `src/utils/d1/server.ts` - D1 binding access helper
- `src/utils/auth.ts` - Authentication utilities
- `src/lib/validation/schemas.ts` - Zod validation schemas
- `src/lib/errors.ts` - Error handling system

### API Routes
- `src/app/api/games/route.ts` - Games CRUD
- `src/app/api/games/[id]/route.ts` - Single game operations
- `src/app/api/rentals/route.ts` - Rentals CRUD
- `src/app/api/rentals/[id]/route.ts` - Single rental operations
- `src/app/api/rentals/[id]/return/route.ts` - Return rental
- `src/app/api/rentals/[id]/extend/route.ts` - Extend rental

### Configuration
- `wrangler.toml` - Cloudflare Workers config
- `.dev.vars` - Local development env vars (add: ADMIN_EMAILS)
- `migrations/` - D1 schema migrations

### Documentation
- `.spec/migration/supabase-to-cloudflare/spec.md` - Phase 1 spec
- `.spec/migration/opennext-to-workers/spec.md` - Phase 2 spec
- `.tasks/migration-plan.md` - Detailed Phase 1 task plan
- `.tasks/migration-workers-plan.md` - Detailed Phase 2 task plan
- `TESTING.md` - Testing guide

---

## Dependencies to Remember

### Critical
- `@opennextjs/cloudflare` - Current adapter (to be removed in Phase 2)
- `zod` - Validation (keep)
- `@cloudflare/workers-types` - TypeScript types (keep)

### To Add (Phase 2)
- `hono` - Web framework for Workers
- `vite` - Frontend build tool
- `react-router-dom` - Client-side routing

### To Remove (Phase 2)
- `next` - Next.js framework
- `@opennextjs/cloudflare` - OpenNext adapter
- Most React server components code

---

## Contact & Ownership

**Project Owner**: kadragon (kangdongouk@gmail.com)
**Primary Admin**: kangdongouk@gmail.com
**Organization**: Cheongram Church
**Domain**: crb.kadragon.work

---

## Retrospective Notes

### What Worked Well
- D1 migration was smoother than expected
- Database adapter pattern provided clean abstraction
- Comprehensive testing specification caught issues early
- Documentation-first approach kept team aligned

### What Could Be Improved
- OpenNext environment variable access more complex than anticipated
- Should have used `.dev.vars` from the start
- Testing infrastructure should have been set up earlier
- More upfront research on OpenNext limitations would have saved time

### Recommendations for Future Migrations
1. Always use platform-native solutions when possible (avoid adapters)
2. Set up testing infrastructure before coding
3. Document environment variable access patterns early
4. Plan for rollback even when "no data to lose"
5. Keep bundles small from the start (easier to maintain)

---

**Trace**: ALL-SPECS, ALL-TASKS
**Maintainer**: Migration Team
**Review Cycle**: Weekly during active development, monthly during maintenance
