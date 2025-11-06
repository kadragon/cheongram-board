# Cloudflare Workers Profile

```yaml
profile_id: cloudflare-workers
version: 2025-11-06
category: deployment-platform
status: active
```

## 1. Platform Constraints

### 1.1 Runtime Limitations
- **Execution Time**:
  - Free: 10ms CPU time per request
  - Paid: 50ms CPU time per request
  - Unbound: Unlimited (for specific workers)
- **Memory**: 128 MB limit
- **Subrequest Limit**: 50 per request (free), 1000 (paid)

### 1.2 Storage Options
- **D1 Database**:
  - SQLite-based
  - 10GB storage per database
  - 100k rows recommended per query
  - Limited to 1 write per transaction
- **KV Storage**:
  - Key-value store
  - 1 MB value limit
  - Eventually consistent
- **Durable Objects**: Stateful, strongly consistent

### 1.3 Compatible Node.js APIs
- Limited `node:` module support
- No filesystem access
- No native modules
- Use `nodejs_compat` flag for basic Node.js APIs

## 2. Non-Functional Requirements (NFR)

### 2.1 Performance
```yaml
response_time:
  p50: < 50ms
  p95: < 150ms
  p99: < 300ms
db_query:
  simple_select: < 10ms
  complex_join: < 50ms
  write_operation: < 30ms
```

### 2.2 Reliability
```yaml
availability: 99.99%
error_rate: < 0.1%
retry_strategy:
  max_retries: 3
  backoff: exponential
  initial_delay: 100ms
```

### 2.3 Security
```yaml
authentication:
  method: cloudflare_access
  fallback: jwt_tokens
encryption:
  in_transit: TLS 1.3
  at_rest: AES-256
headers:
  - X-Frame-Options: DENY
  - X-Content-Type-Options: nosniff
  - Strict-Transport-Security: max-age=31536000
```

### 2.4 Observability
```yaml
logging:
  level: info
  structured: true
  format: json
  pii_masking: enabled
metrics:
  - request_duration
  - db_query_duration
  - error_count
  - cache_hit_ratio
traces:
  enabled: true
  sampling_rate: 0.1
```

## 3. Database Patterns (D1)

### 3.1 Query Patterns
```typescript
// Prepared statements (recommended)
const stmt = env.DB.prepare('SELECT * FROM games WHERE id = ?');
const result = await stmt.bind(gameId).first();

// Batch operations
const batch = [
  env.DB.prepare('INSERT INTO games ...').bind(...values1),
  env.DB.prepare('INSERT INTO games ...').bind(...values2),
];
await env.DB.batch(batch);

// Transactions (read-only for now)
const results = await env.DB.batch([
  env.DB.prepare('SELECT * FROM games'),
  env.DB.prepare('SELECT * FROM rentals'),
]);
```

### 3.2 Migration Pattern
```sql
-- migrations/0001_initial_schema.sql
-- Migration: initial schema
-- Date: 2025-11-06

CREATE TABLE IF NOT EXISTS games (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_games_title ON games(title);
```

### 3.3 Error Handling
```typescript
try {
  const result = await env.DB.prepare(query).bind(params).run();
  if (!result.success) {
    throw new Error('Query failed');
  }
} catch (error) {
  // Log and handle appropriately
  console.error('D1 Error:', error);
  throw new DatabaseError('Failed to execute query', { cause: error });
}
```

## 4. API Development Patterns

### 4.1 Request Handler
```typescript
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    try {
      // Route handling
      const url = new URL(request.url);

      if (url.pathname === '/api/games') {
        return handleGames(request, env);
      }

      return new Response('Not Found', { status: 404 });
    } catch (error) {
      return new Response('Internal Server Error', { status: 500 });
    }
  }
};
```

### 4.2 Response Format
```typescript
// Success response
function successResponse(data: any, meta?: any) {
  return new Response(JSON.stringify({
    success: true,
    data,
    meta,
  }), {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=60',
    },
  });
}

// Error response
function errorResponse(code: string, message: string, status: number) {
  return new Response(JSON.stringify({
    success: false,
    error: { code, message },
  }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
```

## 5. Deployment Configuration

### 5.1 wrangler.toml
```toml
name = "cheongram-board"
main = ".open-next/worker.js"
compatibility_date = "2025-11-06"
compatibility_flags = ["nodejs_compat"]

[[d1_databases]]
binding = "DB"
database_name = "cheongram-board-db"
database_id = "YOUR_DATABASE_ID"

[vars]
ENVIRONMENT = "production"

# Secrets (set via wrangler secret put)
# - JWT_SECRET
# - ADMIN_EMAIL
```

### 5.2 Environment Variables
```bash
# Set secrets
wrangler secret put JWT_SECRET
wrangler secret put ADMIN_EMAIL

# Set variables (for different environments)
wrangler secret put DATABASE_ID --env production
```

## 6. Testing Standards

### 6.1 Local Testing
```bash
# Run locally with Miniflare
wrangler dev

# Test with local D1
wrangler dev --local

# Test with remote D1
wrangler dev --remote
```

### 6.2 Integration Testing
```typescript
// Use Miniflare for testing
import { Miniflare } from 'miniflare';

const mf = new Miniflare({
  script: workerScript,
  d1Databases: {
    DB: 'test-db',
  },
});

const response = await mf.dispatchFetch('http://localhost/api/games');
expect(response.status).toBe(200);
```

## 7. Quality Gates

```yaml
code_quality:
  linting: eslint + typescript
  formatting: prettier
  type_checking: strict
performance:
  bundle_size: < 1MB
  cold_start: < 100ms
  response_time_p95: < 150ms
security:
  dependency_scan: npm audit
  secret_detection: enabled
  auth_required: true
testing:
  unit_coverage: > 80%
  integration_tests: all_routes
  e2e_tests: critical_paths
```

## 8. Migration-Specific Guidelines

### 8.1 Supabase to D1 Translation Rules
- Replace `supabase.from(table).select()` with raw SQL
- Use prepared statements for all queries
- Handle pagination manually (LIMIT/OFFSET)
- Implement relation loading with JOINs or separate queries
- Convert timestamp operations to SQLite functions

### 8.2 Authentication Migration
- Remove `@supabase/ssr` and `@supabase/supabase-js`
- Implement Cloudflare Access header validation
- Use `CF-Access-Authenticated-User-Email` header
- Fallback to custom JWT for programmatic access

### 8.3 Middleware Adaptation
- Next.js middleware runs on Cloudflare Workers
- Use `env` bindings for D1 access
- Cache authentication state when possible
- Minimize subrequests

## 9. Best Practices

### 9.1 DO
✓ Use prepared statements to prevent SQL injection
✓ Implement proper error handling and logging
✓ Use indexes for frequently queried columns
✓ Cache static data with appropriate TTL
✓ Batch database operations when possible
✓ Use TypeScript for type safety

### 9.2 DON'T
✗ Don't use blocking synchronous operations
✗ Don't store sensitive data in plain text
✗ Don't exceed CPU time limits with heavy computation
✗ Don't use unbounded queries (always use LIMIT)
✗ Don't ignore error responses from D1
✗ Don't deploy without testing locally first

## 10. Support and Resources

### Documentation
- [Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)
- [D1 Documentation](https://developers.cloudflare.com/d1/)
- [Wrangler CLI Reference](https://developers.cloudflare.com/workers/wrangler/)

### Community
- [Cloudflare Discord](https://discord.gg/cloudflaredev)
- [GitHub Discussions](https://github.com/cloudflare/workers-sdk/discussions)

### Monitoring
- Cloudflare Dashboard Analytics
- Workers Analytics Engine
- Custom logging to external services (e.g., Sentry, Datadog)
