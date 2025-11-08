# Project Memory and Context

```yaml
last_updated: 2025-11-08
project: cheongram-board
version: 3.0.0
status: production_ready
current_phase: simplified_deployment
```

## Project Overview

Board game rental management system (청람보드) for Cheongram Church, built as a unified Cloudflare Workers application.

### Key Characteristics
- **Domain**: Board game catalog and rental tracking
- **Users**: Church administrators (admin-only system)
- **Scale**: Small database (<10k records), low traffic
- **Architecture**: Unified Cloudflare Workers (Web + API)

---

## Current State (As of 2025-11-08)

### Branch Status
```
main → feat/modernize-homepage-design (active)
```

### Current Work
- **Active Spec**: SPEC-homepage-modernization-1
- **Phase**: Planning and documentation complete
- **Next Task**: TASK-homepage-001 (Modern Hero Section)

### Recent Improvements
- **Enhanced Mock Isolation Strategy** ✅ COMPLETED (2025-11-08)
  - Improved D1Adapter test infrastructure with proper mock isolation
  - Implemented beforeEach/afterEach with vi.clearAllMocks() for test independence
  - Created isolated mock factory functions for D1 database operations
  - Added comprehensive test cases for D1Adapter methods (56 tests total)
  - **Coverage dramatically improved**: 54.35% statements (from 31.53%)
  - **Function coverage**: 76.47% (from 50%)
  - **D1Adapter coverage**: 40.85% statements (from 11.28%)
  - Maintained 100% coverage on validation and error handling modules
  - 4 complex tests marked as TODO for future mock interaction fixes

### Project Architecture

**Current: Unified Workers (api + web)** ✅
```
api/       → Cloudflare Workers (Hono + D1)
  ├── src/
  │   ├── index.ts         # Main entry, API + Static Assets routing
  │   ├── routes/          # API routes (games, rentals, scrape)
  │   ├── lib/             # Database, auth, validation, errors
  │   └── types/           # TypeScript types
  └── wrangler.toml        # Workers config + Assets binding

web/       → React SPA (Vite + React Router)
  ├── src/
  │   ├── components/      # UI components (19 components)
  │   ├── pages/           # Pages (HomePage, Admin*)
  │   ├── lib/             # API client, utils, errors
  │   └── main.tsx         # Entry point
  └── vite.config.ts       # Vite config

migrations/  → D1 database schema
.spec/       → Specifications
.tasks/      → Task management
.governance/ → Project governance
```

### Version History

| Version | Architecture | Status |
|---------|-------------|--------|
| 1.0.0 | Supabase + Next.js | ❌ Deprecated (2025-11-06) |
| 2.0.0 | OpenNext + D1 | ❌ Deprecated (2025-11-07) |
| **3.0.0** | **Unified Workers** | ✅ **Current** |

---

## Migration History

### Phase 1: Supabase → D1 ✅ COMPLETED (2025-11-06)

**Accomplishments**:
- D1 database setup complete
- Schema migrated (games, rentals tables)
- D1Adapter fully functional (720 LOC)
- API routes updated to use D1
- Staging deployment successful
- All 26 API tests passing

**Results**:
- Database: PostgreSQL → D1 (SQLite)
- Auth: Supabase Auth → Cloudflare Access
- Performance: <10ms query time

### Phase 2: OpenNext → Pure Workers ✅ COMPLETED (2025-11-07)

**Phase 2.1 - Backend Migration** ✅
- Hono framework implementation
- All 14 API endpoints migrated
- Bundle size: ~50KB (10x improvement)
- TypeScript: 100% type-safe

**Phase 2.2 - Frontend Separation** ✅
- Vite + React SPA created
- 19 UI components migrated
- React Router for client-side routing
- API client for Workers backend

**Phase 2.3 - Pages Deployment** ✅
- Frontend deployed to Pages staging
- Backend deployed to Workers staging
- Full API validation passed

### Phase 3: Pages → Workers Integration ✅ COMPLETED (2025-11-07)

**Accomplishments**:
- Unified Workers with Static Assets
- SPA fallback for client-side routing
- Single deployment process
- CORS configuration (API-only)

**Benefits**:
- Single deployment command
- Full Workers features (Durable Objects, Cron, Observability)
- Same-origin requests (no CORS issues)
- Simplified management

### Phase 4: Project Restructuring ✅ COMPLETED (2025-11-07)

**Changes**:
- Renamed: `workers/` → `api/`
- Renamed: `frontend/` → `web/`
- Deleted: OpenNext artifacts (`.next/`, `.open-next/`, `src/`)
- Deleted: Config files (`next.config.js`, `open-next.config.ts`)
- Removed: 211MB of build artifacts

**Results**:
- Consistent naming convention (api/web)
- Clean codebase (117 files changed)
- Project size: 2.1GB → 1.6GB (-500MB)
- Independent lint/typecheck per subproject

---

## Current Architecture

### Technology Stack

**API (Cloudflare Workers)**:
- **Framework**: Hono 4.10.4
- **Database**: D1 (SQLite)
- **Validation**: Zod 4.0.5
- **Auth**: Cloudflare Access headers
- **TypeScript**: 5.8.3

**Web (React SPA)**:
- **Build Tool**: Vite 6.0.3
- **Framework**: React 19.1.0
- **Router**: React Router DOM 6.28.0
- **UI**: Radix UI + Tailwind CSS 4.1.11
- **State**: Tanstack React Query 5.62.9

### Deployment Model

```
User Request
     ↓
┌─────────────────────────────────────┐
│ Cloudflare Workers (Unified)        │
│                                     │
│  ┌──────────────────────────────┐  │
│  │ Request Router (Hono)        │  │
│  │ - /api/*  → API Handler      │  │
│  │ - /*      → Static Assets    │  │
│  └──────────┬───────────────────┘  │
│             │                       │
│  ┌──────────▼───────────────────┐  │
│  │ API Routes (Hono)            │  │
│  │ - /api/games                 │  │
│  │ - /api/rentals               │  │
│  │ - /api/scrape                │  │
│  └──────────┬───────────────────┘  │
│             ↓                       │
│       ┌─────────┐                   │
│       │ D1 (DB) │                   │
│       └─────────┘                   │
│                                     │
│  ┌──────────────────────────────┐  │
│  │ Static Assets (Workers       │  │
│  │ Assets)                      │  │
│  │ - index.html                 │  │
│  │ - *.js, *.css                │  │
│  │ - SPA fallback               │  │
│  └──────────────────────────────┘  │
└─────────────────────────────────────┘
```

### Data Model

**Tables**:
1. **games** - Board game catalog
   - Fields: id, title, min_players, max_players, play_time, complexity, description, image_url
   - Indexes: title

2. **rentals** - Rental records
   - Fields: id, game_id, name, email, phone, rented_at, due_date, returned_at, notes
   - Indexes: game_id, returned_at, active rentals (composite)

---

## Development Workflow

### Local Development

**Option 1: Unified (Recommended)**
```bash
cd api
npm run dev
# → http://localhost:8787 (frontend + backend)
```

**Option 2: Separate**
```bash
# Terminal 1: Web with HMR
cd web && npm run dev  # → http://localhost:3000

# Terminal 2: API only
cd api && npm run dev  # → http://localhost:8787
```

### Deployment

**Production** (simplified):
```bash
npm run deploy
# → Builds web/ and deploys unified Workers to production
```

**Development Environment** (local only):
```bash
wrangler dev --env development
# → Uses development configuration with local D1
```

### Testing

**Local API Tests**:
```bash
cd api
.spec/migration/testing/api-tests.sh
# → 26 tests, 16 test cases, 32 assertions
```

**Unit Tests with Coverage**:
```bash
cd api && npm run test:coverage
# → 56 unit tests in api/tests/ (60 total), 54.35% statement coverage, 76.47% function coverage
# → Enhanced mock isolation prevents test interference
```

**Type Check**:
```bash
# API
cd api && npm run typecheck

# Web
cd web && npm run typecheck
```

---

## Key Files Reference

### Core Implementation

**API**:
- `api/src/index.ts` - Main entry point, routing logic
- `api/src/lib/db/adapter.ts` - D1 database adapter
- `api/src/lib/auth/middleware.ts` - Authentication
- `api/src/lib/validation/schemas.ts` - Zod schemas
- `api/wrangler.toml` - Workers + Assets config

**Web**:
- `web/src/App.tsx` - React app entry
- `web/src/lib/api-client.ts` - API client
- `web/src/pages/` - Page components
- `web/src/components/` - UI components
- `web/vite.config.ts` - Vite config

### Configuration

**Environment Variables**:
- `api/.dev.vars` - Local development (ADMIN_EMAILS)
- `web/.env.development` - Local web dev
- `web/.env.staging` - Staging web
- `web/.env.production` - Production web

### Documentation

- `.spec/migration/pages-to-workers/spec.md` - Migration spec
- `.governance/memory.md` - This file
- `api/README.md` - API documentation

---

## Performance Metrics

### Current Performance

| Metric | Value |
|--------|-------|
| Cold Start | <20ms |
| API Response (p95) | <100ms |
| Database Query | <10ms (simple), <50ms (complex) |
| Worker Bundle Size | ~50KB |
| Web Bundle Size | ~470KB (137KB gzipped) |

### Improvements Over OpenNext

| Metric | OpenNext | Pure Workers | Improvement |
|--------|----------|--------------|-------------|
| Cold Start | 50-100ms | <20ms | 3-5x faster |
| Bundle Size | ~500KB | ~50KB | 10x smaller |
| Build Time | 8-10s | <3s | 3x faster |

---

## Critical Lessons Learned

### 1. Cloudflare Workers Static Assets

**Learning**: Workers can serve static assets with the same free tier as Pages.

**Implementation**:
```toml
[assets]
directory = "../web/dist"
binding = "ASSETS"
```

**Benefits**:
- Single deployment
- Access to full Workers features
- Same CDN performance as Pages

### 2. SPA Routing in Workers

**Problem**: Direct access to `/admin/games` returns 404.

**Solution**: Fallback to index.html for all non-API routes:
```typescript
// Forward to Workers Assets
const response = await c.env.ASSETS.fetch(c.req.raw);

// If 404, serve index.html (SPA fallback)
if (response.status === 404) {
  return await c.env.ASSETS.fetch(
    new Request(`${origin}/index.html`)
  );
}
```

### 3. Monorepo Structure

**Learning**: Consistent naming is critical for maintainability.

**Evolution**:
- ❌ `workers/` + `frontend/` - Inconsistent
- ✅ `api/` + `web/` - Clear and consistent

### 4. OpenNext Complexity

**Problem**: OpenNext required Symbol hacks for env access.

**Solution**: Pure Workers directly access env:
```typescript
// Before (OpenNext)
const ctx = (globalThis as any)[Symbol.for('__cloudflare-context__')];
const db = ctx.env?.DB;

// After (Pure Workers)
const db = c.env.DB;
```

---

## Known Limitations

### SQLite (D1)
- No full-text search (use FTS5 if needed)
- 10GB database size limit (sufficient)
- Limited concurrent writes

### Cloudflare Workers
- 50ms CPU time per request (paid tier)
- 128MB memory limit
- No filesystem access

### Current Architecture
- CORS required for separate dev servers
- Static assets must be built before deployment

---

## Next Steps

### Immediate
1. **Deploy to Production** ✅ COMPLETED (2025-11-07)
   - Deployed: https://cheongram-board.kangdongouk.workers.dev
   - Database: cheongram-board-db
   - Smoke tests passing

2. **Simplify Deployment** ✅ COMPLETED (2025-11-08)
   - Removed staging environment (unnecessary for project scale)
   - Removed duplicate wrangler.toml files
   - Single production deployment workflow

3. **Setup GitHub Deployment** ⏳ NEXT
   - Configure GitHub Actions or Cloudflare GitHub integration
   - Set up automated deployments
   - Configure custom domain (crb.kadragon.work)
   - Set up Cloudflare Access for admin authentication
   - See: .tasks/docs/github-deployment.md

### Short-term (Week 1)
1. **Homepage Modernization** 🔄 IN PROGRESS
   - Modern hero section with animations
   - Sticky header and improved layout
   - Dark mode toggle
   - Micro-animations and skeleton UI
   - Target: 6 hours total effort

2. Monitoring and alerts setup
3. Backup/restore procedures
4. User documentation

### Long-term (Month 1-2)
1. Consider Durable Objects for real-time features
2. Implement Cron triggers for maintenance
3. Add comprehensive logging (Logpush)
4. Consider user-level authentication

---

## Deployment Status

### Environments

| Environment | Status | URL | Database |
|-------------|--------|-----|----------|
| Local | ✅ Working | http://localhost:8787 | Local D1 |
| Production | ✅ Working | https://cheongram-board.kangdongouk.workers.dev | cheongram-board-db |

### Previous Deployments (Deprecated)

| Service | Status | Notes |
|---------|--------|-------|
| Staging Environment | ❌ Removed (2025-11-08) | Unnecessary for small-scale project |
| Pages (staging) | ❌ Deleted | Migrated to Workers |
| Workers (backend only) | ❌ Deprecated | Unified with frontend |

---

## Git History

### Recent Commits

1. **d3b1e12** (2025-11-07) - feat(workers): Integrate frontend and backend into unified Workers
   - Added Static Assets support
   - Implemented SPA fallback
   - Unified deployment scripts

2. **4f1fb08** (2025-11-07) - refactor: Restructure project to api/web architecture and remove OpenNext
   - Renamed workers → api, frontend → web
   - Deleted OpenNext artifacts (211MB)
   - Simplified configuration
   - 117 files changed, -7,130 lines

---

## Contact & Ownership

**Project Owner**: kadragon (kangdongouk@gmail.com)
**Primary Admin**: kangdongouk@gmail.com
**Organization**: Cheongram Church
**Domain**: crb.kadragon.work

---

## Retrospective

### What Worked Well
- Clear separation of concerns (api/web)
- Comprehensive testing before migration
- Step-by-step approach (3 phases)
- Documentation-first mindset

### What Could Be Improved
- Should have started with api/web naming
- Earlier adoption of pure Workers
- More upfront research on Static Assets
- Should have avoided creating a staging environment for small-scale projects

### Recommendations for Future
1. Start with Cloudflare-native solutions
2. Avoid adapters when possible
3. Maintain consistent naming conventions
4. Keep comprehensive documentation
5. Test locally before each deployment

---

**Trace**: ALL-SPECS, ALL-TASKS
**Maintainer**: Migration Team
**Review Cycle**: Weekly during active development, monthly during maintenance
**Last Major Update**: 2025-11-07 (Version 3.0.0 - Unified Workers)
