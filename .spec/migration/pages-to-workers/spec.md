# Migration Specification: Pages + Workers 통합

```yaml
spec_id: SPEC-migration-pages-to-workers-1
title: Integrate Frontend Pages to Workers with Static Assets
status: draft
priority: high
created: 2025-11-07
owner: migration-team
trace:
  parent: SPEC-migration-workers-1
  tasks:
    - TASK-pages-to-workers-001: Workers Static Assets 설정
    - TASK-pages-to-workers-002: 라우팅 로직 구현
    - TASK-pages-to-workers-003: 빌드 프로세스 통합
    - TASK-pages-to-workers-004: 테스트 및 배포
```

## Executive Summary

**목표**: Frontend (Pages) + Backend (Workers) 분리 구조를 **하나의 Workers**로 통합

**이유**:
- Cloudflare 공식 권장사항 (2025년 기준)
- Workers에서 Static Assets 무료 서빙 가능
- 더 많은 기능: Durable Objects, Cron, Observability
- 단일 배포: 관리 간소화
- 동일한 비용 구조

**기간**: 1-2일
**위험도**: 낮음 (이미 분리 구조가 완성되어 있음)

---

## 1. Current State (AS-IS)

### 현재 아키텍처

```
사용자
  ↓
┌─────────────────────────────────┐
│ Cloudflare Pages (Frontend)     │
│ - Vite + React SPA              │
│ - URL: *.pages.dev              │
│ - Build: frontend/dist/         │
└───────────────┬─────────────────┘
                │ API 요청
                ↓
┌─────────────────────────────────┐
│ Cloudflare Workers (Backend)    │
│ - Hono API Framework            │
│ - 14 REST endpoints             │
│ - URL: *.workers.dev            │
└───────────────┬─────────────────┘
                ↓
          ┌─────────┐
          │ D1 (DB) │
          └─────────┘
```

### 배포 프로세스

**Frontend**:
```bash
cd frontend
npm run build:staging
wrangler pages deploy dist --project-name=cheongram-board-frontend-staging
```

**Backend**:
```bash
cd workers
wrangler deploy --env staging
```

### 문제점

1. **별도 배포**: 2개의 프로젝트 관리 필요
2. **CORS 설정**: Cross-origin 요청 처리 필요
3. **도메인 분리**: 2개의 URL 관리
4. **제한된 기능**: Pages는 Durable Objects, Cron 등 미지원
5. **배포 복잡도**: Frontend와 Backend 동기화 필요

---

## 2. Target Architecture (TO-BE)

### 통합 아키텍처

```
사용자
  ↓
┌─────────────────────────────────────────┐
│ Cloudflare Workers (Unified)            │
│                                         │
│  ┌──────────────────────────────────┐  │
│  │ Static Assets Handler            │  │
│  │ (Hono + Workers Assets)          │  │
│  │ - /           → index.html       │  │
│  │ - /admin/*    → index.html (SPA) │  │
│  │ - /assets/*   → static files     │  │
│  └──────────────┬───────────────────┘  │
│                 │                       │
│  ┌──────────────▼───────────────────┐  │
│  │ API Router (Hono)                │  │
│  │ - /api/games    → games router   │  │
│  │ - /api/rentals  → rentals router │  │
│  │ - /api/scrape   → scraper router │  │
│  └──────────────┬───────────────────┘  │
└─────────────────┼───────────────────────┘
                  ↓
            ┌─────────┐
            │ D1 (DB) │
            └─────────┘
```

### 기술 스택

**Workers (통합)**:
- **Framework**: Hono 4.x
- **Static Assets**: Workers Assets (built-in)
- **API**: 기존 Hono 라우터 유지
- **Database**: D1 (변경 없음)
- **Auth**: Cloudflare Access (변경 없음)

**Frontend (빌드)**:
- **Build Tool**: Vite 6.x
- **Output**: `frontend/dist/` → Workers assets
- **Runtime**: 없음 (정적 파일만)

---

## 3. Migration Strategy

### Approach: Incremental Integration

**Phase 1**: Workers 설정 (0.5일)
- wrangler.toml에 assets 설정 추가
- Workers에 Static Assets 바인딩

**Phase 2**: 라우팅 구현 (0.5일)
- API 라우터와 Static Assets 분리
- SPA 라우팅 처리 (fallback to index.html)

**Phase 3**: 빌드 통합 (0.5일)
- Frontend 빌드를 Workers 배포 프로세스에 통합
- 단일 배포 스크립트 작성

**Phase 4**: 테스트 및 배포 (0.5일)
- 로컬 테스트 (wrangler dev)
- Staging 배포
- Production 배포

---

## 4. Implementation Details

### 4.1 wrangler.toml 수정

**Before** (workers/wrangler.toml):
```toml
name = "cheongram-board-worker"
main = "src/index.ts"
compatibility_date = "2024-11-06"

[[d1_databases]]
binding = "DB"
database_name = "cheongram-board-db"
database_id = "77627225-92c1-4b09-94c9-d9cb6c9fcf88"
```

**After**:
```toml
name = "cheongram-board"
main = "src/index.ts"
compatibility_date = "2024-11-06"

# Static Assets 추가
[assets]
directory = "../frontend/dist"
binding = "ASSETS"

[[d1_databases]]
binding = "DB"
database_name = "cheongram-board-db"
database_id = "77627225-92c1-4b09-94c9-d9cb6c9fcf88"
```

### 4.2 Workers 라우팅 수정

**workers/src/index.ts** (수정 필요):

```typescript
import { Hono } from 'hono';
import { serveStatic } from 'hono/cloudflare-workers';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import type { Env, Variables } from './types/env';
import { errorHandler } from './lib/errors';
import gamesRouter from './routes/games';
import rentalsRouter from './routes/rentals';
import scraperRouter from './routes/scrape';

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

// Middleware
app.use('*', logger());

// API routes (CORS 필요)
const api = new Hono<{ Bindings: Env; Variables: Variables }>();
api.use('*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'X-Dev-User-Email', 'CF-Access-Authenticated-User-Email'],
}));

// Health check
api.get('/', (c) => {
  return c.json({
    name: 'Cheongram Board API',
    version: '3.0.0',
    status: 'healthy',
    environment: c.env.NODE_ENV,
    timestamp: new Date().toISOString(),
  });
});

api.route('/games', gamesRouter);
api.route('/rentals', rentalsRouter);
api.route('/scrape', scraperRouter);

// Mount API router
app.route('/api', api);

// Static files (MUST be after API routes)
// Forward to Workers Assets
app.get('*', async (c) => {
  const response = await c.env.ASSETS.fetch(c.req.raw);
  // If 404, serve index.html (SPA fallback)
  if (response.status === 404) {
    const indexResponse = await c.env.ASSETS.fetch(new Request(`${new URL(c.req.url).origin}/index.html`));
    return new Response(indexResponse.body, {
      ...indexResponse,
      status: 200,
      headers: { ...Object.fromEntries(indexResponse.headers), 'Content-Type': 'text/html;charset=UTF-8' },
    });
  }
  return response;
});

// 404 handler (API only)
app.notFound((c) => {
  if (c.req.path.startsWith('/api')) {
    return c.json({
      error: {
        code: 'NOT_FOUND',
        message: 'Endpoint not found',
        userMessage: '요청한 엔드포인트를 찾을 수 없습니다.',
        timestamp: new Date().toISOString(),
      },
    }, 404);
  }
  // Static files 404는 index.html로 fallback (위에서 처리됨)
  return c.notFound();
});

// Global error handler
app.onError(errorHandler);

export default app;
```

### 4.3 Environment Types 수정

**workers/src/types/env.ts** (ASSETS 바인딩 추가):

```typescript
export interface Env {
  // Database
  DB: D1Database;

  // Static Assets (추가)
  ASSETS: Fetcher;

  // Environment variables
  NODE_ENV: 'development' | 'staging' | 'production';
  ADMIN_EMAILS: string;
  ALLOW_DEV_HEADER?: string;
}
```

### 4.4 빌드 및 배포 스크립트

**workers/package.json** (scripts 수정):

```json
{
  "scripts": {
    "dev": "wrangler dev",
    "build": "npm run build:frontend && tsc && wrangler deploy --dry-run",
    "build:frontend": "cd ../frontend && npm run build",
    "deploy:staging": "npm run build:frontend && wrangler deploy --env staging",
    "deploy:production": "npm run build:frontend && wrangler deploy --env production",
    "typecheck": "tsc --noEmit"
  }
}
```

### 4.5 로컬 개발 환경

**wrangler dev 실행 시**:
```bash
cd workers
npm run dev
# → http://localhost:8787 에서 frontend + backend 모두 접근 가능
```

**별도 개발 (선택)**:
```bash
# Terminal 1: Frontend (HMR)
cd frontend && npm run dev  # → http://localhost:3000

# Terminal 2: Backend only
cd workers && wrangler dev  # → http://localhost:8787
```

---

## 5. Acceptance Criteria

### AC-1: Static Assets 서빙
- GIVEN: Workers에 Static Assets 설정
- WHEN: 사용자가 `/` 또는 `/admin` 접근
- THEN: Frontend HTML/CSS/JS 정상 로드

### AC-2: API 라우팅
- GIVEN: 통합 Workers 배포
- WHEN: 클라이언트가 `/api/*` 호출
- THEN: 기존 API 응답과 동일하게 동작

### AC-3: SPA 라우팅
- GIVEN: React Router 사용
- WHEN: 사용자가 `/admin/games` 직접 접근
- THEN: index.html로 fallback 후 클라이언트 라우팅

### AC-4: 단일 배포
- GIVEN: 통합 배포 스크립트
- WHEN: `npm run deploy:staging` 실행
- THEN: Frontend + Backend 동시 배포

### AC-5: 성능 유지
- GIVEN: 통합 구조
- WHEN: Static files 요청
- THEN: Pages와 동일한 CDN 캐싱 및 속도

---

## 6. Testing Plan

### Local Testing

1. **Frontend 빌드**:
   ```bash
   cd frontend && npm run build
   ```

2. **Workers 로컬 실행**:
   ```bash
   cd workers && wrangler dev
   ```

3. **테스트 체크리스트**:
   - [ ] `http://localhost:8787/` → Homepage 로드
   - [ ] `http://localhost:8787/admin` → Admin dashboard 로드
   - [ ] `http://localhost:8787/admin/games` → Games 페이지 로드 (direct access)
   - [ ] `http://localhost:8787/api/games` → API 응답 정상
   - [ ] `http://localhost:8787/assets/index-*.js` → JS 파일 로드
   - [ ] DevTools Console: 에러 없음
   - [ ] Network tab: Static files 200 OK

### Staging Deployment

```bash
cd workers
npm run deploy:staging
```

**테스트 URL**: `https://cheongram-board-staging.kangdongouk.workers.dev`

- [ ] Homepage 로드
- [ ] Admin 로그인 (Cloudflare Access)
- [ ] API 호출 정상
- [ ] 게임 목록 조회/추가/수정/삭제
- [ ] 대여 CRUD

---

## 7. Migration Checklist

### Phase 1: Workers 설정 ✅
- [ ] wrangler.toml에 `[assets]` 추가
- [ ] workers/src/types/env.ts에 ASSETS 바인딩 추가
- [ ] TypeScript 컴파일 확인

### Phase 2: 라우팅 구현
- [ ] workers/src/index.ts 수정 (serveStatic 추가)
- [ ] API 라우터 분리 (`/api` prefix)
- [ ] Static files 라우팅 구현
- [ ] SPA fallback 구현 (non-API routes → index.html)
- [ ] CORS 설정 (API만 적용)

### Phase 3: 빌드 통합
- [ ] workers/package.json에 build:frontend 스크립트 추가
- [ ] deploy:staging 스크립트 통합
- [ ] deploy:production 스크립트 통합
- [ ] .gitignore에 frontend/dist 확인

### Phase 4: 테스트 및 배포
- [ ] 로컬 테스트 (위 체크리스트)
- [ ] Staging 배포
- [ ] Staging 테스트 (E2E)
- [ ] Production 배포
- [ ] Production 테스트
- [ ] 기존 Pages 프로젝트 삭제
- [ ] 문서 업데이트 (.governance/memory.md)

---

## 8. Benefits

### 기능적 이점

| 항목 | Pages + Workers (Before) | Unified Workers (After) |
|------|--------------------------|-------------------------|
| **배포** | 2번 (frontend, backend) | 1번 (통합) |
| **도메인** | 2개 URL | 1개 URL |
| **CORS** | 필요 | 불필요 (same-origin) |
| **Durable Objects** | 제한적 (별도 Worker 필요) | 완전 지원 |
| **Cron Triggers** | ❌ | ✅ |
| **Observability** | 제한적 | 완전 지원 (Logs, Logpush) |
| **Gradual Deployments** | ❌ | ✅ |

### 운영적 이점

- **관리 간소화**: 하나의 프로젝트로 통합
- **배포 속도**: 단일 배포 프로세스
- **환경 변수**: 하나의 wrangler.toml에서 관리
- **모니터링**: 통합 대시보드

---

## 9. Risks & Mitigation

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Static Assets 캐싱 이슈 | Low | Medium | Workers Assets는 Pages와 동일한 CDN 사용 |
| SPA 라우팅 실패 | Low | High | Staging에서 충분히 테스트 |
| 빌드 복잡도 증가 | Low | Low | npm scripts로 자동화 |
| API 응답 변경 | Very Low | High | 라우팅만 변경, 로직 변경 없음 |

**Overall Risk**: **Low** ✅

---

## 10. Rollback Plan

**단계**:
1. 이전 Pages + Workers 구조로 복원
2. 기존 staging URLs 재사용:
   - Frontend: `https://1f09738b.cheongram-board-frontend-staging.pages.dev`
   - Backend: `https://cheongram-board-worker-staging.kangdongouk.workers.dev`

**예상 시간**: < 30분

---

## 11. Success Metrics

### Pre-Deployment
- [ ] 로컬 테스트 통과 (7개 항목)
- [ ] TypeScript 에러 없음
- [ ] Build 성공 (frontend + workers)

### Post-Deployment (Staging)
- [ ] Homepage 로드 시간 < 500ms
- [ ] API 응답 시간 < 100ms (p95)
- [ ] Static files 캐싱 정상 (Cache-Control 헤더)
- [ ] Console 에러 없음

### Post-Deployment (Production)
- [ ] 모든 기능 정상 동작
- [ ] 에러율 < 0.1%
- [ ] Cold start < 20ms
- [ ] 24시간 모니터링 이상 없음

---

## 12. Documentation Updates

### 파일 업데이트 필요

1. **/.governance/memory.md**:
   - 아키텍처 섹션 업데이트
   - 배포 프로세스 업데이트
   - 통합 마이그레이션 결과 기록

2. **README.md** (생성 필요):
   - 프로젝트 소개
   - 로컬 개발 가이드
   - 배포 가이드

3. **.spec/migration/pages-to-workers/spec.md**:
   - 이 문서 (작성 완료)

4. **.tasks/pages-to-workers-plan.md**:
   - 상세 작업 계획

---

## 13. Timeline

```
Day 1 (Morning):
  - Phase 1: Workers 설정 (2시간)
  - Phase 2: 라우팅 구현 (2시간)

Day 1 (Afternoon):
  - Phase 3: 빌드 통합 (2시간)
  - Phase 4: 로컬 테스트 (1시간)

Day 2 (Morning):
  - Staging 배포 및 테스트 (2시간)
  - Production 배포 (1시간)

Day 2 (Afternoon):
  - 모니터링 및 문서화 (2시간)
  - Retrospective (1시간)
```

**Total**: **1-2 days**

---

## 14. Definition of Done

- [ ] Specification 작성 완료 (이 문서)
- [ ] wrangler.toml에 assets 설정 추가
- [ ] Workers 라우팅 구현 (API + Static Assets)
- [ ] 빌드 스크립트 통합
- [ ] 로컬 테스트 통과
- [ ] Staging 배포 및 테스트 통과
- [ ] Production 배포
- [ ] 기존 Pages 프로젝트 삭제
- [ ] 문서 업데이트 (.governance/memory.md)
- [ ] Retrospective 완료

---

**Trace**: SPEC-migration-pages-to-workers-1
**Status**: Draft → Ready for Implementation
**Next**: Create detailed task plan and begin Phase 1
