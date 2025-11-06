# Coding Style Guide

```yaml
last_updated: 2025-11-06
status: active
enforced_by:
  - eslint
  - prettier
  - typescript
```

## 1. Language and Framework Standards

### 1.1 TypeScript

**Version**: 5.8.3
**Mode**: Strict
**Configuration**: `tsconfig.json`

```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true
  }
}
```

**Rules**:
- All code must be TypeScript (no `.js` files except config)
- Explicit return types for functions
- No `any` type without justification comment
- Use type inference where obvious

**Examples**:
```typescript
// ✅ Good
function calculateTotal(items: Item[]): number {
  return items.reduce((sum, item) => sum + item.price, 0);
}

// ❌ Bad
function calculateTotal(items) {
  return items.reduce((sum, item) => sum + item.price, 0);
}

// ✅ Acceptable (with justification)
function parseUnknownData(data: unknown): Record<string, any> {
  // Using `any` here because external API returns unknown structure
  return JSON.parse(data as string);
}
```

### 1.2 React/Next.js

**Version**: React 19.1.0, Next.js 15.3.5

**Component Style**:
- Functional components only (no class components)
- Use hooks for state and effects
- Use `"use client"` directive for client-side components
- Server components by default (when applicable)

**Examples**:
```typescript
// ✅ Good
'use client';

import { useState } from 'react';

export function GameList() {
  const [games, setGames] = useState<Game[]>([]);

  // Component logic...

  return <div>...</div>;
}

// ❌ Bad
import React from 'react';

export class GameList extends React.Component {
  // No class components
}
```

---

## 2. Naming Conventions

### 2.1 Files and Directories

- **React Components**: PascalCase (`GameCard.tsx`, `RentalForm.tsx`)
- **Utilities**: camelCase (`validation.ts`, `apiClient.ts`)
- **API Routes**: kebab-case for segments (`api/games/[id]/route.ts`)
- **Constants**: UPPER_SNAKE_CASE (`MAX_PLAYERS.ts`)
- **Types**: PascalCase (`Game.ts`, `Rental.ts`)

### 2.2 Variables and Functions

```typescript
// Variables: camelCase
const gameTitle = 'Catan';
const maxPlayers = 4;

// Functions: camelCase, verb-first
function fetchGames() { }
function createRental() { }
async function validateInput() { }

// Classes: PascalCase
class D1Adapter { }
class ValidationError extends Error { }

// Interfaces/Types: PascalCase
interface Game { }
type RentalFilters = { };

// Constants: UPPER_SNAKE_CASE
const MAX_QUERY_LIMIT = 100;
const DEFAULT_PAGE_SIZE = 20;

// Enums: PascalCase (keys and type)
enum Complexity {
  Low = 'low',
  Medium = 'medium',
  High = 'high'
}
```

### 2.3 Database and API

```typescript
// Database: snake_case (SQLite convention)
CREATE TABLE games (
  id INTEGER,
  min_players INTEGER,
  created_at TEXT
);

// API: camelCase in JSON (TypeScript convention)
{
  "data": {
    "id": 1,
    "minPlayers": 2,
    "createdAt": "2025-11-06T12:00:00Z"
  }
}

// But preserve database naming internally
interface GameRecord {
  id: number;
  min_players: number;  // matches DB
  created_at: string;
}
```

---

## 3. Code Organization

### 3.1 File Structure

```
src/
  app/                    # Next.js pages and routes
    api/                  # API routes
    admin/                # Admin pages
    page.tsx              # Public pages
  components/             # React components
    ui/                   # Base UI components
    GameCard.tsx          # Feature components
  lib/                    # Business logic
    db/                   # Database layer
    validation/           # Validation schemas
    errors.ts             # Error handling
  utils/                  # Utilities
    auth.ts               # Authentication
    d1/                   # D1-specific helpers
  types/                  # Shared types
    index.ts
```

### 3.2 Import Order

```typescript
// 1. External libraries
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

// 2. Internal modules (absolute imports)
import { D1Adapter } from '@/lib/db/d1-adapter';
import { gameCreateSchema } from '@/lib/validation/schemas';

// 3. Relative imports
import { helper } from './helper';

// 4. Types
import type { Game, Rental } from '@/types';

// 5. Styles (if any)
import './styles.css';
```

### 3.3 Export Strategy

```typescript
// Prefer named exports
export function fetchGames() { }
export class D1Adapter { }

// Default export only for:
// - React components (if required by Next.js)
// - Main entry points
export default function GameListPage() { }

// Avoid mixing
// ❌ Bad
export function fetchGames() { }
export default fetchGames;

// ✅ Good
export function fetchGames() { }
```

---

## 4. Function and Method Design

### 4.1 Function Length

- **Maximum**: 50 lines (excluding comments and whitespace)
- **Preferred**: 10-20 lines
- **Guideline**: If function exceeds 50 lines, consider refactoring

### 4.2 Function Signatures

```typescript
// ✅ Good: Clear parameter types and return type
async function createGame(
  adapter: D1Adapter,
  data: CreateGameInput
): Promise<Game> {
  // Implementation
}

// ✅ Good: Use destructuring for objects with many params
async function listGames({
  page = 1,
  limit = 20,
  sortBy = 'title',
  sortOrder = 'asc'
}: GameListParams): Promise<Game[]> {
  // Implementation
}

// ❌ Bad: Too many positional parameters
async function listGames(page, limit, sortBy, sortOrder) {
  // Implementation
}
```

### 4.3 Error Handling

```typescript
// ✅ Good: Explicit error handling
try {
  const result = await riskyOperation();
  return result;
} catch (error) {
  if (error instanceof ValidationError) {
    // Handle specific error
  }
  // Re-throw or handle
  throw error;
}

// ❌ Bad: Silent failures
try {
  const result = await riskyOperation();
  return result;
} catch (error) {
  // Empty catch
}

// ✅ Good: Early returns
function processGame(game: Game | null): string {
  if (!game) {
    throw new NotFoundError('Game');
  }

  if (!game.title) {
    throw new ValidationError('Title is required');
  }

  return game.title;
}

// ❌ Bad: Nested conditions
function processGame(game: Game | null): string {
  if (game) {
    if (game.title) {
      return game.title;
    } else {
      throw new ValidationError('Title is required');
    }
  } else {
    throw new NotFoundError('Game');
  }
}
```

---

## 5. Comments and Documentation

### 5.1 Comment Style

```typescript
// ✅ Good: Explain WHY, not WHAT
// Fallback to localhost detection because NODE_ENV is not always reliable in Workers
const isDevMode = process.env.NODE_ENV === 'development' ||
                  request.headers.get('host')?.includes('localhost');

// ❌ Bad: Comments that repeat the code
// Check if NODE_ENV is development
const isDevMode = process.env.NODE_ENV === 'development';

// ✅ Good: Document complex logic
// Calculate pagination offset using 1-indexed pages
// (page - 1) converts to 0-indexed for SQL OFFSET
const offset = (page - 1) * limit;

// ❌ Bad: Obvious comments
// Set offset
const offset = (page - 1) * limit;
```

### 5.2 JSDoc for Public APIs

```typescript
/**
 * Lists games with filtering and pagination.
 *
 * @param filters - Query filters (page, limit, availability, etc.)
 * @returns Promise resolving to games array and total count
 * @throws {ValidationError} If filters are invalid
 * @throws {DatabaseError} If query fails
 *
 * @example
 * const { games, total } = await adapter.listGames({
 *   availability: 'available',
 *   page: 1,
 *   limit: 20
 * });
 */
async function listGames(filters: GameFilters): Promise<{ games: Game[]; total: number }> {
  // Implementation
}
```

### 5.3 TODO Comments

```typescript
// ✅ Good: TODO with context and owner
// TODO(kadragon): Implement caching for frequent queries (TASK-optimization-001)
const games = await adapter.listGames(filters);

// ❌ Bad: Vague TODO
// TODO: optimize this
const games = await adapter.listGames(filters);
```

---

## 6. Formatting and Style

### 6.1 Line Length

- **Maximum**: 100 characters
- **Preferred**: 80 characters
- **Exception**: URLs, long strings

### 6.2 Indentation

- **Spaces**: 2 spaces (no tabs)
- **Configured in**: `.editorconfig`, Prettier

### 6.3 Quotes

```typescript
// ✅ Single quotes for strings
const title = 'Catan';

// ✅ Double quotes for JSX attributes
<input type="text" value="Catan" />

// ✅ Backticks for template literals
const message = `Game ${title} is available`;
```

### 6.4 Semicolons

- **Required**: Always use semicolons
- **Enforced by**: Prettier

### 6.5 Trailing Commas

```typescript
// ✅ Always use trailing commas (easier diffs)
const game = {
  title: 'Catan',
  minPlayers: 2,
  maxPlayers: 4,  // <- trailing comma
};

const players = [
  'Alice',
  'Bob',
  'Charlie',  // <- trailing comma
];
```

### 6.6 Object and Array Formatting

```typescript
// ✅ Short: Single line
const point = { x: 1, y: 2 };
const colors = ['red', 'blue', 'green'];

// ✅ Long: Multi-line with consistent indentation
const game = {
  id: 1,
  title: 'Catan',
  minPlayers: 2,
  maxPlayers: 4,
  complexity: 'medium',
  description: 'A classic resource management game',
};

// ❌ Bad: Inconsistent
const game = { id: 1, title: 'Catan',
  minPlayers: 2, maxPlayers: 4 };
```

---

## 7. React-Specific Guidelines

### 7.1 Component Structure

```typescript
// ✅ Recommended order:
'use client';

// 1. Imports
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';

// 2. Types/Interfaces
interface GameCardProps {
  game: Game;
  onSelect: (id: number) => void;
}

// 3. Component
export function GameCard({ game, onSelect }: GameCardProps) {
  // 3a. Hooks
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Effect logic
  }, []);

  // 3b. Handlers
  const handleClick = () => {
    onSelect(game.id);
  };

  // 3c. Render
  return (
    <div>
      <h3>{game.title}</h3>
      <Button onClick={handleClick}>Select</Button>
    </div>
  );
}
```

### 7.2 Props Destructuring

```typescript
// ✅ Good: Destructure props
export function GameCard({ game, onSelect }: GameCardProps) {
  return <div>{game.title}</div>;
}

// ❌ Bad: Use props object
export function GameCard(props: GameCardProps) {
  return <div>{props.game.title}</div>;
}
```

### 7.3 Event Handlers

```typescript
// ✅ Good: Prefix with 'handle'
const handleClick = () => { };
const handleSubmit = () => { };
const handleChange = () => { };

// ✅ Good: Pass as 'on' prop
<Button onClick={handleClick} />

// ❌ Bad: Inconsistent naming
const clickHandler = () => { };
const onClick = () => { };
```

---

## 8. Database and SQL

### 8.1 Query Formatting

```typescript
// ✅ Good: Multi-line SQL with template literals
const query = `
  SELECT
    g.id,
    g.title,
    COUNT(r.id) as rental_count
  FROM games g
  LEFT JOIN rentals r ON g.id = r.game_id
  WHERE g.id = ?
  GROUP BY g.id
`;

// ❌ Bad: Long single-line query
const query = 'SELECT g.id, g.title, COUNT(r.id) as rental_count FROM games g LEFT JOIN rentals r ON g.id = r.game_id WHERE g.id = ? GROUP BY g.id';
```

### 8.2 Prepared Statements

```typescript
// ✅ Always use prepared statements
const result = await env.DB.prepare(
  'SELECT * FROM games WHERE id = ?'
).bind(gameId).first();

// ❌ Never concatenate user input
const result = await env.DB.prepare(
  `SELECT * FROM games WHERE id = ${gameId}`  // SQL injection risk!
).first();
```

---

## 9. Testing Standards

### 9.1 Test File Naming

```
src/lib/db/d1-adapter.ts          → __tests__/d1-adapter.test.ts
src/utils/auth.ts                  → __tests__/auth.test.ts
src/app/api/games/route.ts         → __tests__/games-route.test.ts
```

### 9.2 Test Structure

```typescript
import { describe, it, expect, beforeEach } from 'vitest';

describe('D1Adapter', () => {
  let adapter: D1Adapter;

  beforeEach(() => {
    adapter = new D1Adapter(mockDB);
  });

  describe('listGames', () => {
    it('should return games with pagination', async () => {
      // Arrange
      const filters = { page: 1, limit: 20 };

      // Act
      const result = await adapter.listGames(filters);

      // Assert
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

---

## 10. Git Commit Style

### 10.1 Commit Message Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types**:
- `feat`: New feature
- `fix`: Bug fix
- `refactor`: Code refactoring
- `test`: Add or update tests
- `docs`: Documentation changes
- `chore`: Build, dependencies, etc.
- `perf`: Performance improvements

**Examples**:
```
feat(api): add rentals return endpoint

- Implement POST /api/rentals/:id/return
- Update rental status to returned
- Add validation for already returned rentals

Trace: SPEC-migration-001, TASK-api-006

---

fix(auth): resolve admin email env var access

Use Cloudflare context Symbol to access ADMIN_EMAILS in OpenNext.

Trace: TASK-migration-011
```

---

## 11. Linting and Formatting

### 11.1 ESLint Rules

Key rules enforced:
- `@typescript-eslint/no-explicit-any`: Warn (not error, with justification)
- `@typescript-eslint/no-unused-vars`: Error
- `no-console`: Warn (allow for logging in Workers)
- `prefer-const`: Error
- `no-var`: Error

### 11.2 Prettier Configuration

```json
{
  "semi": true,
  "singleQuote": true,
  "trailingComma": "all",
  "printWidth": 100,
  "tabWidth": 2,
  "arrowParens": "avoid"
}
```

### 11.3 Pre-commit Hooks

- Lint all staged files
- Format with Prettier
- Type-check with TypeScript
- Run affected tests

---

## 12. Code Review Checklist

Before submitting:
- [ ] All tests passing
- [ ] Type-check passes (`npm run typecheck`)
- [ ] Linter passes (`npm run lint`)
- [ ] Code formatted (`npm run format`)
- [ ] No console errors/warnings
- [ ] Functions have return types
- [ ] Complex logic has comments
- [ ] Error handling implemented
- [ ] Trace IDs included (SPEC-*, TASK-*)

---

**Trace**: ALL-SPECS
**Enforced by**: ESLint, Prettier, TypeScript, Pre-commit hooks
**Review Frequency**: Quarterly
