# Cheongram Board Workers API

Pure Cloudflare Workers backend for the Cheongram Board Game Rental System.

## Overview

This is the backend API for 청람보드 (Cheongram Board), a board game rental management system for Cheongram Church. Built with Hono framework and deployed on Cloudflare Workers.

**Trace**: SPEC-migration-workers-1

## Architecture

```
Hono API (Workers) → D1 Database
                  → Cloudflare Access (Auth)
```

- **Framework**: Hono v4.6
- **Database**: Cloudflare D1 (SQLite)
- **Authentication**: Cloudflare Access headers
- **Runtime**: Cloudflare Workers

## Project Structure

```
workers/
├── src/
│   ├── index.ts              # Main Hono app entry point
│   ├── types/
│   │   └── env.ts            # Environment & context types
│   ├── lib/
│   │   ├── db/               # Database adapter
│   │   │   ├── adapter.ts    # D1 adapter (720 LOC)
│   │   │   ├── types.ts      # DB types
│   │   │   └── index.ts
│   │   ├── auth/             # Authentication
│   │   │   ├── middleware.ts # requireAuth, requireAdmin
│   │   │   └── index.ts
│   │   ├── validation/       # Request validation
│   │   │   ├── schemas.ts    # Zod schemas
│   │   │   ├── middleware.ts # validateBody, validateQuery
│   │   │   └── index.ts
│   │   ├── errors/           # Error handling
│   │   │   ├── errors.ts     # AppError class
│   │   │   ├── handler.ts    # Global error handler
│   │   │   └── index.ts
│   │   └── utils/
│   │       ├── response.ts   # Response helpers
│   │       └── scraper.ts    # Game info scraper
│   └── routes/
│       ├── games.ts          # Games API (5 endpoints)
│       ├── rentals.ts        # Rentals API (7 endpoints)
│       └── scrape.ts         # Scraper API (1 endpoint)
├── wrangler.toml             # Cloudflare Workers config
├── package.json
├── tsconfig.json
└── .dev.vars                 # Local dev env vars (gitignored)
```

## API Endpoints

### Games API (5 endpoints)
- `GET /api/games` - List games with filters
- `POST /api/games` - Create game (admin)
- `GET /api/games/:id` - Get single game
- `PUT /api/games/:id` - Update game (admin)
- `DELETE /api/games/:id` - Delete game (admin)

### Rentals API (7 endpoints)
- `GET /api/rentals` - List rentals (admin)
- `POST /api/rentals` - Create rental (admin)
- `GET /api/rentals/:id` - Get single rental (admin)
- `PUT /api/rentals/:id` - Update rental (admin)
- `DELETE /api/rentals/:id` - Delete rental (admin)
- `POST /api/rentals/:id/return` - Mark as returned (admin)
- `POST /api/rentals/:id/extend` - Extend due date (admin)

### Scraper API (1 endpoint)
- `POST /api/scrape` - Scrape game info from URL (admin)

**Total**: 14 API endpoints

## Development

### Prerequisites
- Node.js 18+
- Cloudflare account
- Wrangler CLI (`npm install -g wrangler`)

### Setup

1. Install dependencies:
```bash
npm install
```

2. Create `.dev.vars` file:
```bash
cp .dev.vars.example .dev.vars
# Edit .dev.vars and add your admin email
```

3. Run locally:
```bash
npm run dev
```

4. TypeScript check:
```bash
npm run typecheck
```

### Environment Variables

**Local (`.dev.vars`)**:
```
NODE_ENV=development
ADMIN_EMAILS=your-email@example.com
```

**Production (Cloudflare Dashboard or `wrangler secret`)**:
```bash
wrangler secret put ADMIN_EMAILS
# Enter: your-email@example.com
```

## Authentication

### Development Mode
Use `X-Dev-User-Email` header:
```bash
curl -H "X-Dev-User-Email: admin@example.com" \
  http://localhost:8787/api/games
```

### Production
Cloudflare Access sets `CF-Access-Authenticated-User-Email` header automatically.

Admin access is determined by `ADMIN_EMAILS` environment variable (comma-separated).

## Deployment

1. Build and deploy:
```bash
npm run deploy
```

2. Verify deployment:
```bash
curl https://your-worker.workers.dev/
```

## Database

Uses Cloudflare D1 (SQLite) with the following tables:

- **games**: Board game catalog
- **rentals**: Rental records

Database ID: `77627225-92c1-4b09-94c9-d9cb6c9fcf88`

## Performance

- **Bundle Size**: ~50KB (10x smaller than OpenNext)
- **Cold Start**: <20ms (target)
- **TypeScript**: 100% type-safe

## Migration Notes

Migrated from Next.js + OpenNext to Pure Workers:
- **Before**: ~500KB bundle with Symbol hacks
- **After**: ~50KB bundle with direct env access
- **Code Changes**: D1Adapter required zero changes!

See `.spec/migration/opennext-to-workers/spec.md` for details.

## License

ISC
