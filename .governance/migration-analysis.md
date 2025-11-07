# Migration Analysis: Next.js + OpenNext to Pure Cloudflare Workers

## 1. API Routes Structure

### Endpoints Summary
All API routes are currently Next.js App Router routes using `NextRequest`/`NextResponse`.

**Games API:**
- `GET /api/games` - List all games with filters & pagination
- `POST /api/games` - Create new game (admin only)
- `GET /api/games/[id]` - Get single game by ID
- `PUT /api/games/[id]` - Update game (admin only)
- `DELETE /api/games/[id]` - Delete game (admin only)

**Rentals API:**
- `GET /api/rentals` - List all rentals with filters & pagination (admin only)
- `POST /api/rentals` - Create new rental (admin only)
- `GET /api/rentals/[id]` - Get single rental by ID (admin only)
- `PUT /api/rentals/[id]` - Update rental (admin only)
- `DELETE /api/rentals/[id]` - Delete rental (admin only)
- `POST /api/rentals/[id]/return` - Mark rental as returned (admin only)
- `POST /api/rentals/[id]/extend` - Extend rental due date (admin only)

**Utility Endpoints:**
- `POST /api/scrape` - Web scraper endpoint (admin only)
- `GET /api/debug-auth` - Debug auth info (dev only)

### Shared Middleware/Utilities
- **Authentication**: Cloudflare Access headers + local dev fallback
- **Validation**: Request body & search params validation
- **Logging**: API request/response logging with timestamps
- **Monitoring**: Performance metrics tracking
- **Error Handling**: Custom AppError with error codes
- **Audit Logging**: Access & data event logging

---

## 2. Frontend/UI Components

### Page Structure
All pages are in `src/app/` using Next.js App Router:

**Public Pages:**
- `src/app/page.tsx` - Home page (game listing, client-side rendering)
  - Uses `"use client"` directive
  - Client-side fetch of `/api/games`
  - Shows loading/error states
  - Static content with dynamic games list

**Admin Pages:**
- `src/app/admin/page.tsx` - Admin dashboard landing (basic placeholder)
- `src/app/admin/games/page.tsx` - Games management interface
- `src/app/admin/rentals/page.tsx` - Rentals management interface
  - Both admin pages require authentication via middleware

### UI Components (19 total)
- UI Library: Radix UI + custom Tailwind CSS
- **Utility Components**: 
  - `AuthButton.tsx` - Shows auth status
  - `ErrorBoundary.tsx` - Error handling wrapper
- **Feature Components**:
  - `GameList.tsx` / `GameCard.tsx` - Public game display
  - `GamesTable.tsx` / `GameForm.tsx` / `AddGameDialog.tsx` - Admin game management
  - `RentalsTable.tsx` / `RentalForm.tsx` - Admin rental management
  - `ScrapeDialog.tsx` - Batch scrape interface
- **UI Elements**: Button, Card, Dialog, Input, Select, Badge, Checkbox, Label, Toast

### SSR Assessment
- **No SSR features used** - All pages are `"use client"` or simple placeholder components
- **All data fetching is client-side** - Fetch happens in useEffect hooks
- **Statically generated pages** - No getStaticProps, getServerSideProps, or dynamic metadata
- **Recommendation**: Can be deployed as pure static HTML + client-side JS

---

## 3. Database & Infrastructure

### Current Setup
- **Database**: Cloudflare D1 (SQLite)
- **Bindings**: Configured in `wrangler.toml`
  - Binding name: `DB`
  - Database ID: `77627225-92c1-4b09-94c9-d9cb6c9fcf88`
  - Database name: `cheongram-board-db`

### Database Access

**Location**: `src/lib/db/`
- `d1-adapter.ts` - Main D1 database adapter class (720 lines)
- `types.ts` - TypeScript interfaces & types
- `index.ts` - Export interface

**D1Adapter Methods**:
- Games: `listGames()`, `getGame()`, `createGame()`, `updateGame()`, `deleteGame()`, `isGameRented()`
- Rentals: `listRentals()`, `getRental()`, `createRental()`, `returnRental()`, `extendRental()`, `updateRental()`, `deleteRental()`
- All methods use D1 `.prepare()`, `.bind()`, `.all()`, `.first()`, `.run()` API
- **Full SQL control** - Direct SQL queries with parameter binding

**Server-side D1 Access**:
- `src/utils/d1/server.ts` - Helper functions
  - `getDatabase()` - Access DB from Cloudflare context
  - `getD1Adapter()` - Create adapter instance

**Database Access in API Routes**:
```typescript
const adapter = getD1Adapter();
const result = await adapter.listGames(filters);
```

### Auth Utilities

**Location**: `src/utils/auth.ts`
- `getAuthenticatedUserEmail(request)` - Extract from Cloudflare Access headers
- `isAuthenticated(request)` - Check if authenticated
- `checkCloudflareAccessAdmin(request)` - Check admin via ADMIN_EMAILS env var
- **Dev Mode Support**: Falls back to `X-Dev-User-Email` header in development
- **TEMPORARY Flag**: Environment variable detection has workaround comment (line 24-25)

### Logging & Monitoring

**Location**: `src/lib/logging/` & `src/lib/monitoring/`
- `logger.ts` - Structured logging with levels (DEBUG, INFO, WARN, ERROR, FATAL)
- `config.ts` - Logger configuration
- `audit.ts` - Audit event logging (access denied, data changes)
- `integration.ts` - Cross-cutting logging integration
- `health.ts` - Health check monitoring

**Features**:
- Console logging
- Performance tracking
- Request ID correlation
- PII masking (referenced in audit logs)
- Per-component loggers (apiLogger, auditLogger, etc.)

### Validation Utilities

**Location**: `src/lib/validation/`
- `schemas.ts` - Zod validation schemas for requests
- `middleware.ts` - Request body & search param validation
- `client.ts` - Client-side validation
- `utils.ts` - Shared validation helpers

**Schemas Defined**:
- `gameSearchSchema` - GET /api/games query params
- `gameCreateSchema` - POST /api/games body
- `rentalSearchSchema` - GET /api/rentals query params
- `rentalCreateSchema` - POST /api/rentals body

---

## 4. Dependencies Analysis

### Current Package.json Key Dependencies

**Framework & Runtime**:
- `next@15.3.5` - Next.js framework
- `react@19.1.0` - React library
- `react-dom@19.1.0` - React DOM
- `@opennextjs/cloudflare@1.5.1` - OpenNext adapter for Cloudflare

**Build & Deployment**:
- `wrangler@4.24.3` - Cloudflare CLI
- `typescript@5.8.3` - TypeScript

**UI & Styling**:
- `@radix-ui/*` - Headless UI components
- `tailwindcss@4.1.11` - Styling
- `lucide-react@0.525.0` - Icons
- `clsx@2.1.1` - Class name utilities
- `tailwind-merge@3.3.1` - Tailwind merge

**Utilities**:
- `zod@4.0.5` - Schema validation
- `cheerio@1.1.0` - Web scraping (HTML parsing)
- `node-html-parser@7.0.1` - HTML parsing
- `use-debounce@10.0.5` - Debounce hook

**Testing & Quality**:
- `jest@30.0.4` - Testing framework
- `ts-jest@29.4.0` - TypeScript support for Jest
- `@types/*` - TypeScript definitions
- `eslint@9.13.0` / `eslint-config-next` - Linting
- `husky@9.1.6` - Git hooks
- `supertest@7.1.3` - HTTP testing

### Dependency Migration Assessment

**Portable Code** (can work in Workers):
- ✅ `zod` - Schema validation
- ✅ `cheerio` - Web scraping
- ✅ Database adapter code
- ✅ Error handling & logging (can be adapted)
- ✅ Utility functions

**Needs Replacement/Removal**:
- ❌ `next` - Entire framework
- ❌ `react` / `react-dom` - Only needed if keeping SSR (not the case here)
- ❌ `@opennextjs/cloudflare` - OpenNext adapter, will be replaced with direct Workers API
- ❌ `@radix-ui/react-*` - React UI components (keep in frontend build, remove from backend)
- ❌ `use-debounce` - React hook (frontend only)
- ❌ `lucide-react` - React icon library (frontend only)

**Conditional** (depends on deployment strategy):
- ⚠️ React/JSX components - Keep if deploying frontend separately; remove from Worker bundle

---

## 5. Current Pain Points & OpenNext Workarounds

### Identified Issues in Codebase

**1. Environment Variable Access** (src/utils/auth.ts, lines 24-34)
```typescript
// TEMPORARY: Check Cloudflare env to determine if in dev mode
let isDevMode = false;
try {
  const cloudflareContext = (globalThis as any)[Symbol.for('__cloudflare-context__')];
  const cfNodeEnv = cloudflareContext?.env?.NODE_ENV;
  isDevMode = cfNodeEnv === 'development';
} catch (e) {
  // Fallback to process.env if Cloudflare context not available
  isDevMode = process.env.NODE_ENV === 'development';
}
```
**Problem**: Workaround needed because Next.js middleware doesn't directly expose Cloudflare environment. Uses Symbol hack to access context.

**2. Admin Email Configuration** (src/utils/auth.ts, lines 68-78)
**Problem**: Same issue - requires fallback logic to read `ADMIN_EMAILS` from Cloudflare context vs. process.env.

**3. D1 Context Access** (src/utils/d1/server.ts, lines 20-23)
```typescript
const cloudflareContext = (globalThis as any)[Symbol.for('__cloudflare-context__')];
if (!cloudflareContext) {
  throw new Error('Cloudflare context not available...');
}
```
**Problem**: Relies on OpenNext's AsyncLocalStorage workaround to access Cloudflare bindings.

**4. Next.js Middleware Limitations** (src/middleware.ts)
**Problem**: Current middleware uses Next.js `NextRequest`/`NextResponse` which won't exist in pure Workers environment.

### Other Observations
- **No database migrations**: Schema must be pre-created in D1
- **No ORM**: Direct SQL queries (good for portability)
- **No server-side rendering**: All pages are CSR or static (good for Workers)
- **Simple authentication**: Just email header checking (easy to port)

---

## 6. Migration Complexity Estimate

### Complexity Summary by Area

| Area | Complexity | Effort | Notes |
|------|-----------|--------|-------|
| **API Routes** | Low | 2-3 days | Replace NextRequest/NextResponse with Hono or standard Web API |
| **Database Access** | Very Low | 0.5 day | D1Adapter is portable, minimal changes needed |
| **Authentication** | Very Low | 0.5 day | Remove workarounds, use `context.env` directly in Workers |
| **Validation** | Low | 0.5 day | Zod schemas are fully portable |
| **Logging/Monitoring** | Medium | 1-2 days | Adapt to Workers context (no file system), may need external service |
| **Frontend Pages** | Low | 1-2 days | Build separately with any React build tool; serve as static assets |
| **UI Components** | None | 0 days | No changes needed for component code |
| **Testing** | Medium | 1-2 days | Update tests to use Workers-compatible test runners |

### Overall Effort: 4-8 days (small to medium project)

### Risk Areas
1. **Logging to file system** - D1Adapter and logging assume file system access (Workers limitation)
2. **NextRequest/NextResponse API differences** - Minor refactoring needed
3. **Build process** - Currently using `opennextjs-cloudflare build`; need custom build setup
4. **Development experience** - Local testing with Wrangler differs from `next dev`

---

## 7. High-Level Migration Path

### Phase 1: Backend Workers API (2-3 days)
1. Create Hono or custom Worker handler
2. Port API routes from Next.js to Workers
3. Update auth functions to use `context.env` directly
4. Adapt D1Adapter (minimal changes)
5. Adapt validation & error handling
6. Update logging for Workers environment

### Phase 2: Frontend Separation (1-2 days)
1. Extract React components to separate build
2. Build as static HTML + JS (Vite, Next.js build, or similar)
3. Configure Wrangler to serve frontend from `/` and API from `/api`

### Phase 3: Testing & Cleanup (1 day)
1. Update test setup for Workers
2. Remove Next.js dependencies from Worker
3. Remove OpenNext adapter dependency

### Phase 4: Deployment & Verification (0.5 day)
1. Update CI/CD for new build process
2. Test in Cloudflare staging
3. Monitor for issues post-deploy

---

## 8. Key Files to Port/Replace

### Must Rewrite
- `src/app/api/**/*.ts` - Replace with Hono/Worker routes
- `src/middleware.ts` - Replace with Worker middleware
- `src/utils/d1/server.ts` - Minimal changes needed
- `src/utils/auth.ts` - Remove Symbol hacks

### Can Keep (Mostly)
- `src/lib/db/d1-adapter.ts` - Minimal changes (D1 API is same)
- `src/lib/db/types.ts` - No changes
- `src/lib/validation/**/*.ts` - No changes (Zod is portable)
- `src/lib/errors.ts` - No changes

### Frontend Build
- `src/app/page.tsx` - Extract & rebuild
- `src/app/admin/**/*.tsx` - Extract & rebuild
- `src/components/**/*.tsx` - Include in frontend build

### Remove from Worker
- `next.config.js`
- All Next.js configuration
- `src/lib/middleware/` (if Next.js specific)
- Build scripts referencing `opennextjs-cloudflare`

