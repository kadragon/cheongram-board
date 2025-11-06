# Database Migration Catalog

```yaml
catalog_id: database-migration
version: 2025-11-06
category: migration-patterns
status: active
```

## 1. PostgreSQL to SQLite Type Mapping

| PostgreSQL | SQLite | Notes |
|------------|--------|-------|
| SERIAL | INTEGER PRIMARY KEY AUTOINCREMENT | Auto-incrementing integer |
| BIGSERIAL | INTEGER PRIMARY KEY AUTOINCREMENT | SQLite INTEGER is 8 bytes |
| INTEGER | INTEGER | Same |
| BIGINT | INTEGER | SQLite INTEGER handles big integers |
| SMALLINT | INTEGER | SQLite has no small int |
| NUMERIC/DECIMAL | REAL or TEXT | Use TEXT for precision |
| REAL/FLOAT | REAL | Same |
| TEXT/VARCHAR | TEXT | SQLite TEXT has no length limit |
| CHAR(n) | TEXT | SQLite has no fixed-length char |
| BOOLEAN | INTEGER | 0 = false, 1 = true |
| DATE | TEXT | ISO 8601: 'YYYY-MM-DD' |
| TIME | TEXT | ISO 8601: 'HH:MM:SS' |
| TIMESTAMP | TEXT | ISO 8601: 'YYYY-MM-DD HH:MM:SS' |
| TIMESTAMPTZ | TEXT | Store as UTC ISO 8601 |
| JSON/JSONB | TEXT | Store as JSON string |
| UUID | TEXT | Store as string |
| ARRAY | TEXT | Store as JSON array |
| BYTEA | BLOB | Binary data |

## 2. SQL Function Mapping

### Date/Time Functions
```sql
-- PostgreSQL
NOW()                    -- SQLite: datetime('now')
CURRENT_DATE             -- SQLite: date('now')
CURRENT_TIMESTAMP        -- SQLite: datetime('now')
DATE_TRUNC('day', col)   -- SQLite: date(col)
col::date                -- SQLite: date(col)
EXTRACT(YEAR FROM col)   -- SQLite: strftime('%Y', col)
AGE(date1, date2)        -- SQLite: julianday(date1) - julianday(date2)

-- Examples
-- PG: created_at > NOW() - INTERVAL '7 days'
-- SQLite: created_at > datetime('now', '-7 days')
```

### String Functions
```sql
-- PostgreSQL
CONCAT(a, b)             -- SQLite: a || b
SUBSTRING(str, 1, 5)     -- SQLite: substr(str, 1, 5)
POSITION('x' IN str)     -- SQLite: instr(str, 'x')
LOWER(str)               -- SQLite: lower(str) [same]
UPPER(str)               -- SQLite: upper(str) [same]
TRIM(str)                -- SQLite: trim(str) [same]
LENGTH(str)              -- SQLite: length(str) [same]
```

### Conditional Functions
```sql
-- PostgreSQL
COALESCE(a, b, c)        -- SQLite: coalesce(a, b, c) [same]
NULLIF(a, b)             -- SQLite: nullif(a, b) [same]
CASE WHEN ... END        -- SQLite: CASE WHEN ... END [same]
```

### Aggregation
```sql
-- PostgreSQL
COUNT(*), SUM(), AVG(), MIN(), MAX()  -- SQLite: same
ARRAY_AGG(col)                         -- SQLite: json_group_array(col)
JSON_AGG(col)                          -- SQLite: json_group_array(col)
STRING_AGG(col, ',')                   -- SQLite: group_concat(col, ',')
```

## 3. Query Pattern Conversions

### 3.1 Relations (JOIN)
```sql
-- PostgreSQL with Supabase
SELECT * FROM games
JOIN rentals ON games.id = rentals.game_id;

-- SQLite D1 (same)
SELECT * FROM games
JOIN rentals ON games.id = rentals.game_id;

-- Nested JSON (Supabase style)
-- PG: SELECT * FROM games, LATERAL (
--       SELECT json_agg(rentals) as rentals
--       FROM rentals WHERE game_id = games.id
--     )
-- SQLite:
SELECT g.*,
  json_group_array(
    json_object(
      'id', r.id,
      'name', r.name,
      'rented_at', r.rented_at
    )
  ) as rentals
FROM games g
LEFT JOIN rentals r ON g.id = r.game_id
GROUP BY g.id;
```

### 3.2 Pagination
```sql
-- PostgreSQL (Supabase)
SELECT * FROM games LIMIT 20 OFFSET 40;

-- SQLite D1 (same)
SELECT * FROM games LIMIT 20 OFFSET 40;

-- Note: For better performance, use keyset pagination
SELECT * FROM games WHERE id > ? ORDER BY id LIMIT 20;
```

### 3.3 Full-Text Search
```sql
-- PostgreSQL
SELECT * FROM games
WHERE to_tsvector('english', title) @@ to_tsquery('board');

-- SQLite (requires FTS5 virtual table)
CREATE VIRTUAL TABLE games_fts USING fts5(title, content='games');

-- Trigger to keep FTS in sync
CREATE TRIGGER games_fts_insert AFTER INSERT ON games BEGIN
  INSERT INTO games_fts(rowid, title) VALUES (new.id, new.title);
END;

SELECT g.* FROM games g
JOIN games_fts fts ON g.id = fts.rowid
WHERE games_fts MATCH 'board';

-- Simple alternative (less performant)
SELECT * FROM games WHERE title LIKE '%board%';
```

### 3.4 UPSERT
```sql
-- PostgreSQL
INSERT INTO games (id, title) VALUES (1, 'Chess')
ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title;

-- SQLite
INSERT INTO games (id, title) VALUES (1, 'Chess')
ON CONFLICT (id) DO UPDATE SET title = excluded.title;
-- Note: SQLite uses lowercase 'excluded'
```

### 3.5 RETURNING Clause
```sql
-- PostgreSQL
INSERT INTO games (title) VALUES ('Chess') RETURNING *;
UPDATE games SET title = 'Chess' WHERE id = 1 RETURNING *;

-- SQLite D1
-- Use separate SELECT after INSERT
INSERT INTO games (title) VALUES ('Chess');
SELECT * FROM games WHERE id = last_insert_rowid();

-- For UPDATE, you need to query separately
UPDATE games SET title = 'Chess' WHERE id = 1;
SELECT * FROM games WHERE id = 1;
```

## 4. Migration Script Patterns

### 4.1 Schema Migration Template
```sql
-- Migration: [description]
-- Version: YYYYMMDD_HHMMSS
-- Author: [name]

-- Up Migration
BEGIN TRANSACTION;

-- Create tables
CREATE TABLE IF NOT EXISTS new_table (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_new_table_name ON new_table(name);

-- Add check constraints
CREATE TABLE IF NOT EXISTS constrained_table (
  id INTEGER PRIMARY KEY,
  status TEXT CHECK(status IN ('active', 'inactive'))
);

COMMIT;

-- Down Migration (for reference, not executed by D1)
-- DROP TABLE IF EXISTS new_table;
-- DROP INDEX IF EXISTS idx_new_table_name;
```

### 4.2 Data Migration Template
```sql
-- Data migration should be idempotent

BEGIN TRANSACTION;

-- Insert with conflict handling
INSERT OR IGNORE INTO games (id, title) VALUES
  (1, 'Chess'),
  (2, 'Checkers');

-- Update existing data
UPDATE games
SET updated_at = datetime('now')
WHERE updated_at IS NULL;

COMMIT;
```

## 5. Common Pitfalls and Solutions

### 5.1 Boolean Values
```typescript
// PostgreSQL returns true/false
const { data } = await supabase
  .from('games')
  .select('is_available');
// data[0].is_available === true

// SQLite returns 0/1
const result = await env.DB
  .prepare('SELECT is_available FROM games')
  .first();
// result.is_available === 1

// Solution: Convert in application
const isAvailable = Boolean(result.is_available);
```

### 5.2 Timestamp Handling
```typescript
// PostgreSQL
const { data } = await supabase
  .from('games')
  .select('created_at')
  .gte('created_at', '2025-01-01T00:00:00Z');

// SQLite
const result = await env.DB
  .prepare(`
    SELECT created_at FROM games
    WHERE created_at >= ?
  `)
  .bind('2025-01-01 00:00:00')
  .all();

// Always store as UTC, format as ISO 8601
```

### 5.3 NULL vs Empty String
```sql
-- PostgreSQL distinguishes NULL and ''
SELECT * FROM games WHERE title IS NULL;      -- finds NULL
SELECT * FROM games WHERE title = '';         -- finds empty string

-- SQLite also distinguishes (same behavior)
SELECT * FROM games WHERE title IS NULL;      -- finds NULL
SELECT * FROM games WHERE title = '';         -- finds empty string

-- Use consistent NULL handling
```

### 5.4 Foreign Key Constraints
```sql
-- PostgreSQL has FK constraints enabled by default
-- SQLite requires explicit enabling per connection

-- In D1 (enabled by default in newer versions)
PRAGMA foreign_keys = ON;

-- Define FK
CREATE TABLE rentals (
  id INTEGER PRIMARY KEY,
  game_id INTEGER NOT NULL,
  FOREIGN KEY (game_id) REFERENCES games(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE
);
```

### 5.5 Transaction Isolation
```typescript
// PostgreSQL supports multiple concurrent writes
// SQLite/D1 has stricter write locking

// D1: Use batch for multiple inserts
const batch = [
  env.DB.prepare('INSERT INTO games ...').bind(...),
  env.DB.prepare('INSERT INTO games ...').bind(...),
];
await env.DB.batch(batch);

// Note: D1 batch operations are not true transactions yet
// Each statement commits independently
```

## 6. Performance Optimization

### 6.1 Indexes
```sql
-- Create indexes for foreign keys
CREATE INDEX idx_rentals_game_id ON rentals(game_id);

-- Create indexes for filter columns
CREATE INDEX idx_rentals_returned_at ON rentals(returned_at);

-- Create composite indexes for common queries
CREATE INDEX idx_rentals_game_status
  ON rentals(game_id, returned_at);

-- Create partial indexes
CREATE INDEX idx_active_rentals
  ON rentals(game_id)
  WHERE returned_at IS NULL;
```

### 6.2 Query Optimization
```sql
-- Use EXPLAIN QUERY PLAN to analyze
EXPLAIN QUERY PLAN
SELECT * FROM games
JOIN rentals ON games.id = rentals.game_id
WHERE games.title LIKE '%Chess%';

-- Prefer indexed columns in WHERE
-- Use LIMIT to restrict result sets
-- Avoid SELECT *, specify only needed columns
-- Use prepared statements (cached execution plans)
```

### 6.3 Batch Operations
```typescript
// Bad: Multiple separate queries
for (const game of games) {
  await env.DB.prepare('INSERT INTO games ...').bind(game.title).run();
}

// Good: Batch operation
const batch = games.map(game =>
  env.DB.prepare('INSERT INTO games ...').bind(game.title)
);
await env.DB.batch(batch);
```

## 7. Data Validation Rules

### 7.1 Type Coercion
```typescript
// Always validate and coerce types
function validateGameData(data: any) {
  return {
    title: String(data.title),
    min_players: parseInt(data.min_players, 10),
    max_players: parseInt(data.max_players, 10),
    is_available: Boolean(data.is_available),
    created_at: new Date(data.created_at).toISOString(),
  };
}
```

### 7.2 Constraint Enforcement
```sql
-- Use CHECK constraints
CREATE TABLE games (
  id INTEGER PRIMARY KEY,
  title TEXT NOT NULL CHECK(length(title) > 0),
  min_players INTEGER CHECK(min_players > 0),
  max_players INTEGER CHECK(max_players >= min_players),
  complexity TEXT CHECK(complexity IN ('low', 'medium', 'high'))
);
```

## 8. Testing Migration

### 8.1 Data Integrity Tests
```typescript
// Compare row counts
const pgCount = await supabase.from('games').select('*', { count: 'exact' });
const d1Count = await env.DB.prepare('SELECT COUNT(*) as count FROM games').first();
expect(d1Count.count).toBe(pgCount.count);

// Compare random samples
const pgSample = await supabase.from('games').select('*').eq('id', 123).single();
const d1Sample = await env.DB.prepare('SELECT * FROM games WHERE id = ?').bind(123).first();
expect(d1Sample.title).toBe(pgSample.data.title);
```

### 8.2 Query Equivalence Tests
```typescript
// Test that migrated queries return same results
const supabaseResult = await supabase
  .from('games')
  .select('*')
  .gte('min_players', 2)
  .order('title');

const d1Result = await env.DB
  .prepare('SELECT * FROM games WHERE min_players >= ? ORDER BY title')
  .bind(2)
  .all();

expect(d1Result.results.length).toBe(supabaseResult.data.length);
expect(d1Result.results[0].title).toBe(supabaseResult.data[0].title);
```

## 9. Rollback Procedures

### 9.1 Backup Before Migration
```bash
# Export Supabase data
supabase db dump --data-only > backup_$(date +%Y%m%d).sql

# Export D1 data (if rolling back from D1)
wrangler d1 export cheongram-board-db > d1_backup_$(date +%Y%m%d).sql
```

### 9.2 Restore Procedures
```bash
# Restore to Supabase
psql $SUPABASE_CONNECTION_STRING < backup_20251106.sql

# Restore to D1
wrangler d1 execute cheongram-board-db --file=d1_backup_20251106.sql
```

## 10. Monitoring and Alerting

### 10.1 Query Performance
```typescript
// Log slow queries
const start = Date.now();
const result = await env.DB.prepare(query).bind(...params).all();
const duration = Date.now() - start;

if (duration > 100) {
  console.warn('Slow query detected', { query, duration, params });
}
```

### 10.2 Error Tracking
```typescript
// Track migration-related errors
try {
  await migrateData();
} catch (error) {
  console.error('Migration error', {
    error: error.message,
    stack: error.stack,
    timestamp: new Date().toISOString(),
  });
  // Send to error tracking service
  throw error;
}
```
