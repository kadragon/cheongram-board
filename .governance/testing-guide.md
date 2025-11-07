# Local Testing Guide

This guide explains how to test the Cheongram Board application locally after the Supabase to Cloudflare D1 migration.

## Prerequisites

- Node.js 18+ installed
- Wrangler CLI installed (via npm/npx)
- Local environment configured

## Setup

### 1. Environment Configuration

Update `.env.local` with your admin email:

```bash
# .env.local
ADMIN_EMAILS=your-email@example.com
NODE_ENV=development
```

### 2. Database Setup

The local D1 database should already be set up. To verify:

```bash
# Check local database status
npx wrangler d1 migrations list cheongram-board-db --local

# If migrations need to be applied
npx wrangler d1 migrations apply cheongram-board-db --local
```

### 3. Add Test Data

Add sample games to test with:

```bash
npx wrangler d1 execute cheongram-board-db --local --command "
INSERT INTO games (title, min_players, max_players, play_time, complexity, description)
VALUES
  ('Catan', 3, 4, 90, 'medium', 'Classic resource management game'),
  ('Pandemic', 2, 4, 45, 'medium', 'Cooperative disease control game'),
  ('Ticket to Ride', 2, 5, 60, 'low', 'Train route building game');
"
```

## Running the Application

### Option 1: Next.js Development Server (Recommended for Quick Testing)

```bash
npm run dev
```

Visit `http://localhost:3000`

**Note**: For local dev with Next.js dev server, you'll need to set authentication headers manually using browser extensions or curl.

### Option 2: Wrangler Preview (Production-like Environment)

```bash
npm run preview
```

This builds with OpenNext and runs with Wrangler, simulating the Cloudflare Workers environment.

## Testing API Endpoints

### Authentication Headers

For local testing, use the `X-Dev-User-Email` header to simulate Cloudflare Access authentication:

```bash
# Set this to an email in your ADMIN_EMAILS list
X-Dev-User-Email: your-email@example.com
```

### Using curl for API Testing

#### 1. List Games (Public)

```bash
curl http://localhost:3000/api/games
```

#### 2. Get Single Game (Public)

```bash
curl http://localhost:3000/api/games/1
```

#### 3. Create Game (Admin Required)

```bash
curl -X POST http://localhost:3000/api/games \
  -H "Content-Type: application/json" \
  -H "X-Dev-User-Email: your-email@example.com" \
  -d '{
    "title": "Azul",
    "min_players": 2,
    "max_players": 4,
    "play_time": 45,
    "complexity": "low",
    "description": "Tile-placement game"
  }'
```

#### 4. Update Game (Admin Required)

```bash
curl -X PUT http://localhost:3000/api/games/1 \
  -H "Content-Type: application/json" \
  -H "X-Dev-User-Email: your-email@example.com" \
  -d '{
    "title": "Catan - Updated",
    "play_time": 120
  }'
```

#### 5. Delete Game (Admin Required)

```bash
curl -X DELETE http://localhost:3000/api/games/1 \
  -H "X-Dev-User-Email: your-email@example.com"
```

#### 6. List Rentals (Admin Required)

```bash
curl http://localhost:3000/api/rentals \
  -H "X-Dev-User-Email: your-email@example.com"
```

#### 7. Create Rental (Admin Required)

```bash
curl -X POST http://localhost:3000/api/rentals \
  -H "Content-Type: application/json" \
  -H "X-Dev-User-Email: your-email@example.com" \
  -d '{
    "game_id": 1,
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "010-1234-5678",
    "rented_at": "2025-11-06",
    "due_date": "2025-11-20"
  }'
```

#### 8. Return Rental (Admin Required)

```bash
curl -X POST http://localhost:3000/api/rentals/1/return \
  -H "X-Dev-User-Email: your-email@example.com"
```

#### 9. Extend Rental (Admin Required)

```bash
curl -X POST http://localhost:3000/api/rentals/1/extend \
  -H "Content-Type: application/json" \
  -H "X-Dev-User-Email: your-email@example.com" \
  -d '{
    "new_due_date": "2025-12-01"
  }'
```

### Using Browser Extensions

For testing with the web interface:

1. Install a header modification extension (e.g., ModHeader for Chrome)
2. Add a custom header:
   - Name: `X-Dev-User-Email`
   - Value: `your-email@example.com` (must be in ADMIN_EMAILS)
3. Visit `http://localhost:3000`
4. Access admin features at `http://localhost:3000/admin`

## Expected Results

### Successful Responses

API responses follow this structure:

```json
{
  "data": { /* result data */ },
  "meta": {
    "timestamp": "2025-11-06T12:00:00.000Z"
  }
}
```

### Error Responses

Error responses follow this structure:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Technical error message",
    "userMessage": "User-friendly message in Korean",
    "timestamp": "2025-11-06T12:00:00.000Z",
    "details": { /* optional error details */ }
  }
}
```

## Testing Checklist

### Basic Functionality
- [ ] List all games (public endpoint)
- [ ] Get single game details (public endpoint)
- [ ] Create new game (admin only)
- [ ] Update existing game (admin only)
- [ ] Delete game (admin only)
- [ ] Create rental (admin only)
- [ ] List rentals (admin only)
- [ ] Return rental (admin only)
- [ ] Extend rental (admin only)

### Authentication & Authorization
- [ ] Access public endpoints without authentication
- [ ] Access admin endpoints with valid admin email
- [ ] Get 403 error when accessing admin endpoints with non-admin email
- [ ] Get 401 error when accessing admin endpoints without X-Dev-User-Email header

### Error Handling
- [ ] Create game with missing required fields (should return 400)
- [ ] Update non-existent game (should return 404)
- [ ] Create rental for already rented game (should return 409)
- [ ] Return already returned rental (should return appropriate error)
- [ ] Delete game with active rentals (should return error)

### Data Validation
- [ ] Create game with invalid player counts (min > max)
- [ ] Create game with invalid complexity value
- [ ] Create rental with invalid date format
- [ ] Extend rental with past date

### Business Logic
- [ ] Game marked as rented after creating rental
- [ ] Game marked as available after returning rental
- [ ] Cannot create rental for already rented game
- [ ] Can delete game only when no active rentals

## Troubleshooting

### Issue: "Unauthorized" error in local development

**Solution**: Make sure you're setting the `X-Dev-User-Email` header with an email that's in your `ADMIN_EMAILS` environment variable.

### Issue: Database not found

**Solution**: Run migrations:
```bash
npx wrangler d1 migrations apply cheongram-board-db --local
```

### Issue: TypeScript errors

**Solution**: Run type check:
```bash
npm run typecheck
```

### Issue: Cannot access /admin page

**Solution**: Ensure `X-Dev-User-Email` header is set and matches an admin email in `ADMIN_EMAILS`.

## Next Steps

After successful local testing:

1. **Staging Deployment**: Deploy to staging environment
2. **Integration Testing**: Test in staging with real Cloudflare Access
3. **Production Deployment**: Deploy to production
4. **Monitoring Setup**: Configure alerts and monitoring

## Database Inspection

To inspect the local database:

```bash
# Count games
npx wrangler d1 execute cheongram-board-db --local --command "SELECT COUNT(*) as count FROM games"

# Count rentals
npx wrangler d1 execute cheongram-board-db --local --command "SELECT COUNT(*) as count FROM rentals"

# View active rentals
npx wrangler d1 execute cheongram-board-db --local --command "SELECT * FROM rentals WHERE returned_at IS NULL"

# View game rental status
npx wrangler d1 execute cheongram-board-db --local --command "
SELECT g.id, g.title,
  CASE WHEN r.id IS NOT NULL THEN 'Rented' ELSE 'Available' END as status
FROM games g
LEFT JOIN rentals r ON g.id = r.game_id AND r.returned_at IS NULL
"
```

## API Documentation

For detailed API documentation including request/response schemas, see:
- Error codes: `src/lib/errors.ts`
- Validation schemas: `src/lib/validation/schemas.ts`
- API types: `src/lib/db/types.ts`
