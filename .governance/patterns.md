# Reusable Patterns and Practices

```yaml
last_updated: 2025-11-06
category: development_patterns
status: active
```

## 1. Database Migration Patterns

### 1.1 PostgreSQL to SQLite Type Mapping

| PostgreSQL | SQLite | Notes |
|------------|--------|-------|
| SERIAL, BIGSERIAL | INTEGER PRIMARY KEY AUTOINCREMENT | Auto-increment |
| VARCHAR(n), TEXT | TEXT | No length enforcement in SQLite |
| BOOLEAN | INTEGER | Use 0/1 |
| TIMESTAMP, TIMESTAMPTZ | TEXT | Store as ISO 8601: `datetime('now')` |
| NUMERIC, DECIMAL | REAL or TEXT | TEXT for precise decimals |
| JSON, JSONB | TEXT | Use `json_*` functions |
| ARRAY | TEXT | JSON array or separate table |
| UUID | TEXT | Store as string |
| ENUM | TEXT | Add CHECK constraint |

### 1.2 SQL Function Mapping

| PostgreSQL | SQLite | Example |
|------------|--------|---------|
| NOW() | datetime('now') | `created_at TEXT DEFAULT (datetime('now'))` |
| ARRAY_AGG | json_group_array() | `json_group_array(column_name)` |
| JSONB operators | json_*() functions | `json_extract(data, '$.key')` |
| RETURNING clause | Use last_insert_rowid() | See pattern below |
| OFFSET/LIMIT | LIMIT offset, limit | `LIMIT 20 OFFSET 40` |

### 1.3 RETURNING Clause Pattern

**PostgreSQL**:
```sql
INSERT INTO games (title) VALUES ($1) RETURNING *;
```

**SQLite** (D1):
```typescript
const insertResult = await env.DB.prepare(
  'INSERT INTO games (title) VALUES (?)'
).bind(title).run();

if (insertResult.success) {
  const game = await env.DB.prepare(
    'SELECT * FROM games WHERE id = ?'
  ).bind(insertResult.meta.last_row_id).first();
}
```

### 1.4 Relation Loading Pattern

**Supabase** (automatic):
```typescript
const { data } = await supabase
  .from('games')
  .select('*, rentals(*)')
  .eq('id', gameId);
```

**D1** (explicit JOIN):
```typescript
const game = await env.DB.prepare(`
  SELECT
    g.*,
    json_group_array(
      json_object(
        'id', r.id,
        'rented_at', r.rented_at,
        'returned_at', r.returned_at
      )
    ) as rentals
  FROM games g
  LEFT JOIN rentals r ON g.id = r.game_id
  WHERE g.id = ?
  GROUP BY g.id
`).bind(gameId).first();

// Parse rentals JSON
game.rentals = JSON.parse(game.rentals);
```

### 1.5 Pagination Pattern

```typescript
// Query with pagination
const page = 1; // 1-indexed
const limit = 20;
const offset = (page - 1) * limit;

const { results } = await env.DB.prepare(`
  SELECT * FROM games
  ORDER BY title ASC
  LIMIT ? OFFSET ?
`).bind(limit, offset).all();

// Count total for pagination meta
const { total } = await env.DB.prepare(`
  SELECT COUNT(*) as total FROM games
`).first();

// Return with pagination
return {
  data: results,
  meta: {
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  }
};
```

### 1.6 Transaction Pattern (D1)

```typescript
// D1 supports batched statements (atomic execution)
const results = await env.DB.batch([
  env.DB.prepare('INSERT INTO games (title) VALUES (?)').bind('Game 1'),
  env.DB.prepare('INSERT INTO games (title) VALUES (?)').bind('Game 2'),
  env.DB.prepare('INSERT INTO games (title) VALUES (?)').bind('Game 3')
]);

// Check if all succeeded
const allSuccess = results.every(r => r.success);
```

---

## 2. Authentication Patterns

### 2.1 Cloudflare Access Integration

**Middleware Pattern**:
```typescript
import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Skip auth for public routes
  if (pathname.startsWith('/api/games') && request.method === 'GET') {
    return NextResponse.next();
  }

  // Check Cloudflare Access header
  const email = request.headers.get('CF-Access-Authenticated-User-Email');

  // Dev mode fallback
  const isDevMode = process.env.NODE_ENV === 'development' ||
                    request.headers.get('host')?.includes('localhost');

  if (isDevMode) {
    const devEmail = request.headers.get('X-Dev-User-Email');
    if (devEmail) {
      const response = NextResponse.next();
      response.headers.set('X-Authenticated-User', devEmail);
      return response;
    }
  }

  if (!email) {
    return NextResponse.json({
      error: { code: 'UNAUTHORIZED', message: 'Authentication required' }
    }, { status: 401 });
  }

  // Check admin status
  const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim());
  if (!adminEmails.includes(email)) {
    return NextResponse.json({
      error: { code: 'FORBIDDEN', message: 'Admin access required' }
    }, { status: 403 });
  }

  // Pass through with user header
  const response = NextResponse.next();
  response.headers.set('X-Authenticated-User', email);
  return response;
}

```

**Hono Middleware Pattern**:
```typescript
import { Context, Next } from 'hono';
import { Env } from '../types';

export async function authMiddleware(c: Context<{ Bindings: Env }>, next: Next) {
  const userEmail = c.req.header('CF-Access-Authenticated-User-Email') ||
                    c.req.header('X-Dev-User-Email');

  if (!userEmail) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const adminEmails = c.env.ADMIN_EMAILS?.split(',') || [];
  if (!adminEmails.includes(userEmail)) {
    return c.json({ error: 'Forbidden' }, 403);
  }

  // Store user email for downstream handlers
  c.set('userEmail', userEmail);
  await next();
}

// Usage in routes:
app.post('/api/games', authMiddleware, async (c) => {
  const userEmail = c.get('userEmail');
  // ... rest of route logic
});
```

### 2.2 Development Mode Authentication

**Setup** (`.dev.vars`):
```
ADMIN_EMAILS=admin@example.com,admin2@example.com
NODE_ENV=development
```

**Testing with curl**:
```bash
curl -X POST http://localhost:8787/api/games \
  -H "Content-Type: application/json" \
  -H "X-Dev-User-Email: admin@example.com" \
  -d '{"title":"Test Game","min_players":2,"max_players":4}'
```

**Testing with Browser Extension** (ModHeader):
```
Header: X-Dev-User-Email
Value: admin@example.com
```

### 2.3 Production Cloudflare Access Setup

```toml
# wrangler.toml
# Configure via Cloudflare Dashboard → Zero Trust → Access

# Access Policy:
#   Application: cheongram-board
#   Domain: crb.kadragon.work
#   Paths: /admin/*, /api/* (except GET /api/games, /api/games/:id)
#   Allow: Email in list (kangdongouk@gmail.com)
```

---

## 3. Validation Patterns

### 3.1 Zod Schema Definition

```typescript
import { z } from 'zod';

// Base schemas
const gameBaseSchema = z.object({
  title: z.string().min(1, '제목은 필수입니다').max(255, '제목이 너무 깁니다'),
  min_players: z.number().int().positive().optional(),
  max_players: z.number().int().positive().optional(),
  play_time: z.number().int().positive().optional(),
  complexity: z.enum(['low', 'medium', 'high']).optional(),
  description: z.string().optional(),
  image_url: z.string().url('유효한 URL이 아닙니다').optional(),
});

// Create schema with refinements
export const gameCreateSchema = gameBaseSchema.refine(
  data => {
    if (data.min_players && data.max_players) {
      return data.min_players <= data.max_players;
    }
    return true;
  },
  {
    message: '최소 인원은 최대 인원보다 클 수 없습니다',
    path: ['max_players']
  }
);

// Update schema (all fields optional)
export const gameUpdateSchema = gameBaseSchema.partial();

// Search params schema
export const gameSearchSchema = z.object({
  query: z.string().optional(),
  min_players: z.coerce.number().int().positive().optional(),
  max_players: z.coerce.number().int().positive().optional(),
  complexity: z.enum(['low', 'medium', 'high']).optional(),
  availability: z.enum(['available', 'rented']).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  sort_by: z.enum(['title', 'created_at', 'play_time']).default('title'),
  sort_order: z.enum(['asc', 'desc']).default('asc'),
});
```

### 3.2 Validation Middleware

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

export function validateBody<T extends z.ZodType>(schema: T) {
  return async (request: NextRequest) => {
    try {
      const body = await request.json();
      const validated = schema.parse(body);
      return { success: true, data: validated };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Request validation failed',
            details: error.flatten()
          }
        }, { status: 400 });
      }
      throw error;
    }
  };
}

// Usage in route
export async function POST(request: NextRequest) {
  const validation = await validateBody(gameCreateSchema)(request);
  if (validation instanceof NextResponse) return validation; // Error response

  const gameData = validation.data;
  // ... create game
}
```

### 3.3 Client-Side Validation

```typescript
import { z } from 'zod';

const gameFormSchema = z.object({
  title: z.string().min(1, '제목을 입력해주세요'),
  min_players: z.number().min(1).max(10).optional(),
  max_players: z.number().min(1).max(20).optional(),
}).refine(
  data => !data.min_players || !data.max_players || data.min_players <= data.max_players,
  { message: '최소 인원은 최대 인원보다 클 수 없습니다', path: ['max_players'] }
);

// React Hook Form integration
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

const { register, handleSubmit, formState: { errors } } = useForm({
  resolver: zodResolver(gameFormSchema)
});
```

---

## 4. Error Handling Patterns

### 4.1 Custom Error Classes

```typescript
// src/lib/errors.ts
export class AppError extends Error {
  constructor(
    public code: string,
    public message: string,
    public userMessage: string,
    public statusCode: number = 500,
    public details?: any
  ) {
    super(message);
    this.name = 'AppError';
  }

  toJSON() {
    return {
      code: this.code,
      message: this.message,
      userMessage: this.userMessage,
      timestamp: new Date().toISOString(),
      ...(this.details && { details: this.details })
    };
  }
}

// Predefined errors
export class ValidationError extends AppError {
  constructor(message: string, details?: any) {
    super('VALIDATION_ERROR', message, '입력값을 확인해주세요', 400, details);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super('NOT_FOUND', `${resource} not found`, '요청하신 항목을 찾을 수 없습니다', 404);
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super('CONFLICT', message, '요청을 처리할 수 없습니다', 409);
  }
}
```

### 4.2 Error Handling in Routes

```typescript
export async function GET(request: NextRequest) {
  try {
    const adapter = getD1Adapter();
    const games = await adapter.listGames({});

    return NextResponse.json({
      data: games,
      meta: { timestamp: new Date().toISOString() }
    });
  } catch (error) {
    // AppError instances
    if (error instanceof AppError) {
      return NextResponse.json(
        { error: error.toJSON() },
        { status: error.statusCode }
      );
    }

    // Unexpected errors
    console.error('Unexpected error:', error);
    return NextResponse.json({
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error',
        userMessage: '서버 오류가 발생했습니다',
        timestamp: new Date().toISOString()
      }
    }, { status: 500 });
  }
}
```

### 4.3 Database Error Handling

```typescript
async function executeQuery<T>(query: string, params: any[]): Promise<T> {
  try {
    const result = await env.DB.prepare(query).bind(...params).first<T>();
    return result;
  } catch (error) {
    // D1-specific errors
    if (error instanceof Error) {
      if (error.message.includes('UNIQUE constraint')) {
        throw new ConflictError('Record already exists');
      }
      if (error.message.includes('FOREIGN KEY constraint')) {
        throw new ValidationError('Referenced record does not exist');
      }
      if (error.message.includes('NOT NULL constraint')) {
        throw new ValidationError('Required field is missing');
      }
    }

    // Generic database error
    throw new AppError(
      'DATABASE_ERROR',
      error instanceof Error ? error.message : 'Database query failed',
      '데이터베이스 오류가 발생했습니다',
      500
    );
  }
}
```

---

## 5. Logging Patterns

### 5.1 Structured Logging

```typescript
// src/lib/logging/logger.ts
interface LogContext {
  requestId?: string;
  userId?: string;
  [key: string]: any;
}

class Logger {
  private context: LogContext;

  constructor(context: LogContext = {}) {
    this.context = context;
  }

  info(message: string, meta?: any) {
    console.log(JSON.stringify({
      level: 'info',
      message,
      timestamp: new Date().toISOString(),
      ...this.context,
      ...meta
    }));
  }

  error(message: string, error?: Error, meta?: any) {
    console.error(JSON.stringify({
      level: 'error',
      message,
      error: error ? {
        message: error.message,
        stack: error.stack
      } : undefined,
      timestamp: new Date().toISOString(),
      ...this.context,
      ...meta
    }));
  }

  child(context: LogContext): Logger {
    return new Logger({ ...this.context, ...context });
  }
}

// Usage
const logger = new Logger({ requestId: generateId() });
logger.info('Processing request', { endpoint: '/api/games' });

const userLogger = logger.child({ userId: 'user@example.com' });
userLogger.info('User action', { action: 'create_game' });
```

### 5.2 Request Logging Middleware

```typescript
export async function logRequest(request: NextRequest): Promise<string> {
  const requestId = crypto.randomUUID();
  const logger = new Logger({ requestId });

  logger.info('Request received', {
    method: request.method,
    url: request.url,
    userAgent: request.headers.get('user-agent')
  });

  return requestId;
}

// In route
export async function POST(request: NextRequest) {
  const requestId = await logRequest(request);
  const logger = new Logger({ requestId });

  try {
    // ... processing
    logger.info('Request completed', { status: 200 });
  } catch (error) {
    logger.error('Request failed', error);
    throw error;
  }
}
```

### 5.3 Performance Monitoring

```typescript
class PerformanceMonitor {
  async measureAsync<T>(
    operation: string,
    fn: () => Promise<T>
  ): Promise<T> {
    const start = Date.now();
    try {
      const result = await fn();
      const duration = Date.now() - start;

      console.log(JSON.stringify({
        type: 'performance',
        operation,
        duration,
        success: true,
        timestamp: new Date().toISOString()
      }));

      return result;
    } catch (error) {
      const duration = Date.now() - start;

      console.error(JSON.stringify({
        type: 'performance',
        operation,
        duration,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      }));

      throw error;
    }
  }
}

// Usage
const monitor = new PerformanceMonitor();

const games = await monitor.measureAsync('db.listGames', async () => {
  return await adapter.listGames(filters);
});
```

---

## 6. Testing Patterns

### 6.1 API Test Structure

```bash
#!/bin/bash

API_BASE="http://localhost:8787"
ADMIN_EMAIL="admin@example.com"

# Test function
test_api() {
  local name="$1"
  local method="$2"
  local endpoint="$3"
  local expected_status="$4"
  local data="$5"

  local curl_cmd="curl -s -X $method"

  if [ -n "$data" ]; then
    curl_cmd="$curl_cmd -H 'Content-Type: application/json' -d '$data'"
  fi

  curl_cmd="$curl_cmd -H 'X-Dev-User-Email: $ADMIN_EMAIL' -w '\n%{http_code}' $API_BASE$endpoint"

  local response=$(eval $curl_cmd)
  local status=$(echo "$response" | tail -n1)
  local body=$(echo "$response" | sed '$d')

  if [ "$status" == "$expected_status" ]; then
    echo "✅ PASS: $name (Status: $status)"
    return 0
  else
    echo "❌ FAIL: $name (Expected: $expected_status, Got: $status)"
    echo "Response: $body"
    return 1
  fi
}

# Run tests
test_api "List games" "GET" "/api/games" "200"
test_api "Create game" "POST" "/api/games" "201" '{"title":"Test","min_players":2}'
test_api "Invalid game" "POST" "/api/games" "400" '{"title":""}'
```

### 6.2 Unit Test Pattern (Vitest)

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { D1Adapter } from './d1-adapter';

describe('D1Adapter', () => {
  let adapter: D1Adapter;
  let mockDB: D1Database;

  beforeEach(() => {
    mockDB = createMockDB();
    adapter = new D1Adapter(mockDB);
  });

  describe('listGames', () => {
    it('should return games with pagination', async () => {
      const result = await adapter.listGames({ page: 1, limit: 20 });

      expect(result.games).toBeInstanceOf(Array);
      expect(result.total).toBeGreaterThanOrEqual(0);
    });

    it('should filter by availability', async () => {
      const result = await adapter.listGames({ availability: 'available' });

      result.games.forEach(game => {
        expect(game.is_rented).toBe(false);
      });
    });
  });
});
```

### 6.3 Integration Test Pattern

```typescript
import { unstable_dev } from 'wrangler';
import type { UnstableDevWorker } from 'wrangler';

describe('API Integration', () => {
  let worker: UnstableDevWorker;

  beforeAll(async () => {
    worker = await unstable_dev('src/index.ts', {
      experimental: { disableExperimentalWarning: true }
    });
  });

  afterAll(async () => {
    await worker.stop();
  });

  it('should create and retrieve game', async () => {
    // Create
    const createResp = await worker.fetch('/api/games', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Dev-User-Email': 'admin@test.com'
      },
      body: JSON.stringify({ title: 'Integration Test Game', min_players: 2 })
    });

    expect(createResp.status).toBe(201);
    const created = await createResp.json();
    const gameId = created.data.id;

    // Retrieve
    const getResp = await worker.fetch(`/api/games/${gameId}`);
    expect(getResp.status).toBe(200);

    const retrieved = await getResp.json();
    expect(retrieved.data.title).toBe('Integration Test Game');
  });
});
```

---

## 7. Deployment Patterns

### 7.1 Environment-Specific Configuration

```toml
# wrangler.toml

name = "cheongram-board"
main = "src/index.ts"
compatibility_date = "2025-11-06"
compatibility_flags = ["nodejs_compat"]

[[d1_databases]]
binding = "DB"
database_name = "cheongram-board-db"
database_id = "production-db-id"

[env.staging]
name = "cheongram-board-staging"

[[env.staging.d1_databases]]
binding = "DB"
database_name = "cheongram-board-db-staging"
database_id = "staging-db-id"

[env.development]
name = "cheongram-board-dev"
```

### 7.2 Migration Deployment

```bash
#!/bin/bash

# Deploy migrations to specific environment
deploy_migrations() {
  local env=$1

  echo "Applying migrations to $env..."

  if [ "$env" == "production" ]; then
    wrangler d1 migrations apply cheongram-board-db --remote
  elif [ "$env" == "staging" ]; then
    wrangler d1 migrations apply cheongram-board-db-staging --remote --env staging
  else
    wrangler d1 migrations apply cheongram-board-db --local
  fi

  echo "Migrations applied successfully"
}

# Deploy Worker
deploy_worker() {
  local env=$1

  echo "Deploying Worker to $env..."

  if [ "$env" == "production" ]; then
    wrangler deploy
  elif [ "$env" == "staging" ]; then
    wrangler deploy --env staging
  else
    wrangler dev
  fi
}

# Full deployment
deploy_migrations "$1"
deploy_worker "$1"
```

### 7.3 Rollback Strategy

```bash
#!/bin/bash

# Rollback to previous version
rollback() {
  local version=$1

  echo "Rolling back to version $version..."

  # Revert deployment
  wrangler rollback --message "Rollback to $version"

  # Revert migrations (manual intervention required)
  echo "⚠️  Manual database rollback may be needed"
  echo "Check migrations in wrangler d1 migrations list"
}
```

---

## 8. Performance Optimization Patterns

### 8.1 Query Optimization

```typescript
// ❌ Bad: N+1 query problem
const games = await adapter.listGames({});
for (const game of games) {
  game.rentals = await adapter.getRentalsForGame(game.id);
}

// ✅ Good: Single query with JOIN
const games = await env.DB.prepare(`
  SELECT
    g.*,
    json_group_array(
      CASE WHEN r.id IS NOT NULL THEN
        json_object('id', r.id, 'rented_at', r.rented_at)
      ELSE NULL END
    ) as rentals
  FROM games g
  LEFT JOIN rentals r ON g.id = r.game_id
  GROUP BY g.id
`).all();
```

### 8.2 Caching Pattern

```typescript
// Simple in-memory cache (Workers)
const cache = new Map<string, { data: any; expires: number }>();

async function getCached<T>(
  key: string,
  ttlMs: number,
  fetcher: () => Promise<T>
): Promise<T> {
  const cached = cache.get(key);

  if (cached && cached.expires > Date.now()) {
    return cached.data;
  }

  const data = await fetcher();
  cache.set(key, { data, expires: Date.now() + ttlMs });

  return data;
}

// Usage
const games = await getCached('games:all', 60000, async () => {
  return await adapter.listGames({});
});
```

### 8.3 Batch Operations

```typescript
// ❌ Bad: Multiple individual inserts
for (const game of gamesToCreate) {
  await env.DB.prepare('INSERT INTO games (title) VALUES (?)').bind(game.title).run();
}

// ✅ Good: Batch insert
const statements = gamesToCreate.map(game =>
  env.DB.prepare('INSERT INTO games (title) VALUES (?)').bind(game.title)
);

await env.DB.batch(statements);
```

---

**Trace**: SPEC-ALL, TASK-ALL
**Last Reviewed**: 2025-11-06
**Next Review**: 2025-12-06 (monthly during maintenance)
