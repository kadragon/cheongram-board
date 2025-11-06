# Migration Specification: OpenNext to Pure Cloudflare Workers

```yaml
spec_id: SPEC-migration-workers-1
title: Migrate from Next.js + OpenNext to Pure Cloudflare Workers
status: draft
priority: high
created: 2025-11-06
owner: migration-team
trace:
  parent: SPEC-migration-supabase-to-cloudflare-1
  tasks:
    - TASK-workers-001: Backend Migration (Phase 1)
      subtasks:
        - TASK-workers-001.1: Project Setup & Structure
        - TASK-workers-001.2: Port D1 Adapter
        - TASK-workers-001.3: Auth Middleware
        - TASK-workers-001.4: Validation Middleware
        - TASK-workers-001.5: Games API Routes
        - TASK-workers-001.6: Rentals API Routes
        - TASK-workers-001.7: Scraper API Route
        - TASK-workers-001.8: Error Handling & Logging
    - TASK-workers-002: Frontend Extraction (Phase 2)
      subtasks:
        - TASK-workers-002.1: Frontend Project Setup
        - TASK-workers-002.2: Port UI Components
        - TASK-workers-002.3: API Client Integration
    - TASK-workers-003: Testing & Integration (Phase 3)
      subtasks:
        - TASK-workers-003.1: Update Test Suite
        - TASK-workers-003.2: Local Development Experience
        - TASK-workers-003.3: Quality Gates Validation
    - TASK-workers-004: Deployment & Finalization (Phase 4)
      subtasks:
        - TASK-workers-004.1: Staging Deployment
        - TASK-workers-004.2: Production Deployment
        - TASK-workers-004.3: Documentation & Cleanup
        - TASK-workers-004.4: Retrospective
```

## Executive Summary

Migrate the current Next.js application running on OpenNext/Cloudflare to a **pure Cloudflare Workers** architecture with:
- **Backend**: Hono framework on Workers
- **Frontend**: Static React build on Cloudflare Pages
- **Database**: D1 (no changes)
- **Benefits**: Simpler env access, better performance, smaller bundle, easier debugging

**Estimated Effort**: 4-8 days
**Risk Level**: Low (clean abstractions, no SSR, no data migration)

---

## 1. Current State Analysis

### Architecture (AS-IS)
```
┌─────────────────────────────────────┐
│   Next.js 15.3.5 Application        │
│   (SSR disabled, CSR only)          │
├─────────────────────────────────────┤
│  API Routes     │  React UI Pages   │
│  /api/*         │  /admin, /        │
└────────┬────────┴─────────┬─────────┘
         │                  │
    ┌────▼──────────────────▼────┐
    │  @opennextjs/cloudflare    │
    │  (Adapter layer)           │
    └────────────┬───────────────┘
                 │
    ┌────────────▼───────────────┐
    │  Cloudflare Workers        │
    └────────────┬───────────────┘
                 │
          ┌──────┴──────┐
          ▼             ▼
        ┌───┐         ┌────┐
        │D1 │         │KV* │
        └───┘         └────┘
```

### Pain Points
1. **Environment Variable Access**: Requires `Symbol.for('__cloudflare-context__')` hack
2. **Bundle Size**: ~500KB (OpenNext overhead)
3. **Cold Start**: 50-100ms (Next.js runtime)
4. **Debugging**: Multiple abstraction layers
5. **Maintenance**: OpenNext is community project (unofficial)

### Components to Migrate

| Component | LOC | Complexity | Dependencies |
|-----------|-----|-----------|--------------|
| API Routes (14 endpoints) | ~1500 | Low | D1, Zod, Auth |
| D1 Adapter | 720 | Very Low | @cloudflare/workers-types |
| Auth Utils | 100 | Very Low | None |
| Validation | 300 | Very Low | Zod |
| Logging System | 500 | Medium | Custom |
| UI Pages (4) | ~2000 | Low | React, Radix UI |
| UI Components (19) | ~1500 | Low | React, Radix UI |

**Total**: ~6,620 LOC

---

## 2. Target Architecture (TO-BE)

```
┌──────────────────────┐
│ Cloudflare Pages     │  Static React SPA
│ /admin, /            │  (Vite + React)
└──────────┬───────────┘
           │ REST API
           ▼
┌──────────────────────┐
│ Cloudflare Workers   │  Hono Framework
│ /api/*               │  (Pure TypeScript)
└──────────┬───────────┘
           │
    ┌──────┴──────┐
    ▼             ▼
  ┌───┐        ┌────┐
  │ D1│        │ KV*│
  └───┘        └────┘

* KV for future features
```

### Technology Stack

**Backend (Worker)**:
- **Framework**: Hono 4.x (14KB, fast routing)
- **Validation**: Zod 4.x (keep existing schemas)
- **Database**: D1Adapter (port as-is)
- **Auth**: Cloudflare Access headers
- **Logging**: Simplified for Workers (no filesystem)
- **TypeScript**: 5.x with Workers types

**Frontend (Pages)**:
- **Build Tool**: Vite 5.x
- **Framework**: React 18.x
- **UI**: Keep Radix UI + Tailwind
- **State**: React Query for API calls
- **Routing**: React Router or Tanstack Router

---

## 3. Migration Strategy

### Approach: **Big Bang** (Not Incremental)

**Rationale**:
- No production data (fresh start)
- Clean break from OpenNext complexity
- Simpler than running parallel systems

### Phases

#### Phase 1: Backend Migration (2-3 days)
**Goal**: Rewrite API routes as Hono Workers

**Tasks**:
1. Set up Hono project structure
2. Port D1Adapter (minimal changes)
3. Rewrite auth middleware
4. Port 14 API endpoints
5. Update validation middleware
6. Simplify logging for Workers

**Acceptance Criteria**:
- All 14 endpoints functional
- Tests passing (port existing tests)
- Admin auth working with `env.ADMIN_EMAILS`
- Response format matches current API

#### Phase 2: Frontend Extraction (1-2 days)
**Goal**: Extract UI to standalone Vite build

**Tasks**:
1. Create Vite project
2. Copy React components
3. Set up React Router
4. Configure API base URL
5. Build and test locally

**Acceptance Criteria**:
- All 4 pages render correctly
- API calls work to Worker backend
- Admin auth flow intact
- Production build < 500KB

#### Phase 3: Integration & Testing (1-2 days)
**Goal**: End-to-end testing and deployment

**Tasks**:
1. Update test suite for Workers
2. Create D1 migration scripts
3. Test Cloudflare Access integration
4. Load testing
5. Deploy to staging

**Acceptance Criteria**:
- All tests passing (API + E2E)
- Performance metrics: cold start < 20ms
- Admin auth verified in staging
- Documentation updated

#### Phase 4: Production Deployment (0.5 day)
**Goal**: Deploy to production

**Tasks**:
1. Run D1 migrations on production
2. Deploy Worker
3. Deploy Pages
4. Configure custom domain
5. Verify in production

---

## 4. API Contract (Unchanged)

### Authentication
**Dev Mode** (NODE_ENV=development):
```http
X-Dev-User-Email: admin@example.com
```

**Production** (Cloudflare Access):
```http
CF-Access-Authenticated-User-Email: admin@example.com
```

### Response Format
```typescript
// Success
{
  data: T,
  meta: {
    timestamp: string,
    pagination?: { page, limit, total },
    ...
  }
}

// Error
{
  error: {
    code: string,
    message: string,
    userMessage: string,
    timestamp: string,
    details?: any
  }
}
```

### Endpoints (No Changes)

**Games**:
- `GET /api/games` - List with filters
- `POST /api/games` - Create (admin)
- `GET /api/games/:id` - Get single
- `PUT /api/games/:id` - Update (admin)
- `DELETE /api/games/:id` - Delete (admin)

**Rentals**:
- `GET /api/rentals` - List
- `POST /api/rentals` - Create (admin)
- `GET /api/rentals/:id` - Get single
- `PUT /api/rentals/:id` - Update (admin)
- `DELETE /api/rentals/:id` - Delete (admin)
- `POST /api/rentals/:id/return` - Return (admin)
- `POST /api/rentals/:id/extend` - Extend (admin)

**Utilities**:
- `POST /api/scrape` - Scrape game info (admin)

---

## 5. Data & State

### Database (No Changes)
- D1 schema: **unchanged**
- Existing data: **none** (fresh start)
- Migrations: **reuse existing** (in `/migrations`)

### Configuration

**Environment Variables**:
```toml
# wrangler.toml (Worker)
[vars]
NODE_ENV = "production"

# Secrets (wrangler secret put)
ADMIN_EMAILS = "kangdongouk@gmail.com"

[[d1_databases]]
binding = "DB"
database_name = "cheongram-board-db"
database_id = "77627225-92c1-4b09-94c9-d9cb6c9fcf88"
```

**Frontend (.env)**:
```bash
VITE_API_BASE_URL=https://api.crb.kadragon.work
```

---

## 6. Performance & Quality Gates

### Performance Targets
| Metric | Current | Target | Improvement |
|--------|---------|--------|-------------|
| Bundle Size (Worker) | ~500KB | <100KB | 5x smaller |
| Cold Start | 50-100ms | <20ms | 3-5x faster |
| Response Time (p95) | 150ms | <100ms | 1.5x faster |
| Build Time | 8-10s | <3s | 3x faster |

### Quality Gates

All gates must pass before merging to main and before production deployment.

#### Mandatory Gates (CI/CD Enforced)

1. **Test Coverage**
   - Lines: ≥80%
   - Branches: ≥70%
   - Tool: `vitest --coverage`
   - Blocker: Yes (CI fails if not met)

2. **Type Safety**
   - Zero TypeScript errors
   - No `any` types without explicit justification comment
   - Tool: `tsc --noEmit`
   - Blocker: Yes

3. **Linting**
   - ESLint: 0 errors, 0 warnings
   - Prettier: all files formatted
   - Tool: `eslint . && prettier --check .`
   - Blocker: Yes

4. **Security Scan**
   - Dependency vulnerabilities: 0 critical, 0 high
   - Tool: `npm audit --audit-level=moderate`
   - OWASP checks: SQL injection, XSS prevention verified
   - Blocker: Yes for critical/high vulnerabilities

5. **License Scan**
   - All dependencies have compatible licenses (MIT, Apache-2.0, BSD)
   - No GPL/AGPL dependencies
   - Tool: `npx license-checker --production --failOn 'GPL;AGPL'`
   - Blocker: Yes

6. **Performance Regression**
   - Cold start: Must be ≤20ms (measured via Cloudflare Analytics)
   - Response time p95: Must be ≤100ms
   - Bundle size: Worker ≤100KB, Frontend ≤500KB
   - Tool: `wrangler deploy --dry-run` + size check, load testing with `k6`
   - Blocker: Yes if regression >20% vs baseline

#### Phase-Specific Gates

**Phase 1 (Backend)**:
- [ ] All API routes functional
- [ ] D1 adapter tests passing
- [ ] Auth middleware tests passing
- [ ] Validation tests passing

**Phase 2 (Frontend)**:
- [ ] All UI components render
- [ ] Build size ≤500KB
- [ ] No console errors in browser

**Phase 3 (Integration)**:
- [ ] All quality gates passing
- [ ] E2E tests passing
- [ ] Load test: 100 req/s without errors

**Phase 4 (Deployment)**:
- [ ] Staging smoke tests passing
- [ ] Production smoke tests passing
- [ ] Monitoring dashboards configured
- [ ] Rollback plan tested

---

## 7. Tracing & Test Coverage

### Test IDs
```yaml
TEST-workers-AC1-1: List games API (Worker)
TEST-workers-AC1-2: Get game details (Worker)
TEST-workers-AC2-1: Admin auth via env.ADMIN_EMAILS
TEST-workers-AC2-2: Reject non-admin
TEST-workers-AC3-*: Games CRUD operations
TEST-workers-AC4-*: Rentals CRUD operations
TEST-workers-AC5-*: Error handling
TEST-workers-AC6-*: Business logic validation
TEST-workers-UI-1: Frontend renders correctly
TEST-workers-UI-2: API integration works
```

### Acceptance Criteria

**AC-1: API Parity**
- GIVEN: Worker backend deployed
- WHEN: Client calls any endpoint
- THEN: Response matches current API contract

**AC-2: Environment Access Simplified**
- GIVEN: Worker with env bindings
- WHEN: Admin checks `c.env.ADMIN_EMAILS`
- THEN: Value accessed directly (no Symbol hack)

**AC-3: Performance Improved**
- GIVEN: Worker deployed
- WHEN: Cold start measured
- THEN: < 20ms (vs 50-100ms)

**AC-4: Frontend Standalone**
- GIVEN: Vite build deployed to Pages
- WHEN: User accesses /admin
- THEN: UI loads and functions correctly

**AC-5: Tests Updated**
- GIVEN: Test suite rewritten
- WHEN: Tests run
- THEN: All pass (coverage ≥80%)

---

## 8. Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Logging compatibility issues | Medium | Low | Use console.log + Cloudflare Logs |
| Frontend build complexity | Low | Low | Vite has excellent docs |
| API contract breaking changes | Very Low | High | Comprehensive test suite |
| Performance regression | Very Low | Medium | Load testing before prod |
| Auth flow issues | Low | High | Staging environment testing |

**Overall Risk**: **Low** ✅

---

## 9. Rollback Plan

**Not Needed** - fresh deployment with no existing users or data.

If issues arise:
1. Keep OpenNext code in `archive/` branch
2. Re-deploy from archive if critical issues
3. Estimated rollback time: <1 hour

---

## 10. Success Metrics

### Pre-Deployment
- [ ] All 14 API endpoints migrated
- [ ] 29 tests passing (API + E2E)
- [ ] Frontend build < 500KB
- [ ] Worker bundle < 100KB
- [ ] Documentation updated

### Post-Deployment (Week 1)
- [ ] Cold start < 20ms (p95)
- [ ] API response time < 100ms (p95)
- [ ] Error rate < 0.1%
- [ ] Admin auth functioning
- [ ] No critical bugs reported

---

## 11. Timeline

```
Week 1:
  Day 1-2: Backend migration (Hono + API routes)
  Day 3-4: Frontend extraction (Vite + React)
  Day 5: Integration testing

Week 2:
  Day 1: Final testing + staging deployment
  Day 2: Production deployment + monitoring
```

**Total**: **5-7 days** (including buffer)

---

## 12. Definition of Done

- [x] Specification approved
- [ ] Backend Worker deployed and functional
- [ ] Frontend Pages deployed and functional
- [ ] All tests passing (≥80% coverage)
- [ ] Performance targets met
- [ ] Production deployed
- [ ] Custom domain configured
- [ ] Cloudflare Access configured
- [ ] Documentation updated
- [ ] Retrospective completed

---

## Appendix A: File Structure

### Worker Backend
```
workers/
  src/
    index.ts              # Hono app entry
    routes/
      games.ts            # Games endpoints
      rentals.ts          # Rentals endpoints
      scrape.ts           # Scraper
    lib/
      db/
        adapter.ts        # D1Adapter (ported)
        types.ts
      validation/
        schemas.ts        # Zod schemas (ported)
        middleware.ts
      auth/
        middleware.ts     # Simplified auth
      errors/
        handler.ts        # Error handling
    types/
      env.ts              # Bindings type
  wrangler.toml           # Worker config
  package.json
```

### Frontend (Pages)
```
frontend/
  src/
    pages/               # React pages (ported)
    components/          # UI components (ported)
    lib/
      api-client.ts      # API wrapper
    main.tsx
  index.html
  vite.config.ts
  package.json
```

---

## Appendix B: Dependencies

### Worker
```json
{
  "dependencies": {
    "hono": "^4.0.0",
    "zod": "^4.0.5"
  },
  "devDependencies": {
    "@cloudflare/workers-types": "^4.0.0",
    "wrangler": "^4.0.0",
    "vitest": "^1.0.0",
    "typescript": "^5.0.0"
  }
}
```

### Frontend
```json
{
  "dependencies": {
    "react": "^18.0.0",
    "react-dom": "^18.0.0",
    "react-router-dom": "^6.0.0",
    "@tanstack/react-query": "^5.0.0",
    "@radix-ui/react-*": "^1.0.0"
  },
  "devDependencies": {
    "vite": "^5.0.0",
    "typescript": "^5.0.0",
    "tailwindcss": "^4.0.0"
  }
}
```

---

**Trace**: SPEC-migration-workers-1
**Status**: Draft → Pending Review
**Next**: Create detailed task breakdown in `.tasks/`
