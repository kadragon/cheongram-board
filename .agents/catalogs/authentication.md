# Authentication Catalog

```yaml
catalog_id: authentication
version: 2025-11-06
category: security
status: active
```

## 1. Supabase Auth to Cloudflare Access Migration

### 1.1 Current State (Supabase Auth)
```typescript
// src/utils/supabase/server.ts
import { createServerClient } from '@supabase/ssr';

const supabase = createClient();
const { data: { user }, error } = await supabase.auth.getUser();

if (!user) {
  return redirect('/login');
}
```

### 1.2 Target State (Cloudflare Access)
```typescript
// src/utils/auth/cloudflare-access.ts
export function getAuthenticatedUser(request: Request): string | null {
  // Cloudflare Access injects authenticated user email in header
  const email = request.headers.get('CF-Access-Authenticated-User-Email');

  if (!email) {
    return null;
  }

  return email;
}

export function requireAuth(request: Request): string {
  const email = getAuthenticatedUser(request);

  if (!email) {
    throw new UnauthorizedError('Authentication required');
  }

  return email;
}
```

## 2. Authentication Methods

### 2.1 Cloudflare Access (Primary - Recommended)

**Pros:**
- Zero-trust network access
- No code changes for auth flow
- Integrated with Cloudflare dashboard
- Email-based authentication (Google, GitHub, etc.)
- No need to manage JWT tokens
- Automatic SSL/TLS

**Cons:**
- Requires Cloudflare dashboard configuration
- Limited to Cloudflare's supported identity providers
- Less control over auth flow
- May require paid plan for advanced features

**Setup:**
```bash
# 1. Enable Cloudflare Access in dashboard
# 2. Create Access Policy
# 3. Configure identity provider (Google, GitHub, etc.)
# 4. Add application

# wrangler.toml (no changes needed)
```

**Implementation:**
```typescript
// middleware.ts
export function middleware(request: NextRequest) {
  const email = request.headers.get('CF-Access-Authenticated-User-Email');

  if (!email) {
    // User not authenticated by Cloudflare Access
    return NextResponse.redirect(new URL('/unauthorized', request.url));
  }

  // Check if user is admin
  const adminEmails = (process.env.ADMIN_EMAILS || '').split(',');
  if (!adminEmails.includes(email)) {
    return NextResponse.redirect(new URL('/forbidden', request.url));
  }

  // User is authenticated and authorized
  return NextResponse.next();
}

export const config = {
  matcher: '/api/:path*',
};
```

### 2.2 Custom JWT Authentication (Alternative)

**Pros:**
- Full control over auth flow
- Can implement custom user management
- API-friendly for programmatic access
- Can store user metadata in D1

**Cons:**
- Requires implementation effort
- Need to manage JWT secrets
- Need to implement token refresh
- Additional security considerations

**Setup:**
```bash
# Add JWT dependency
npm install jsonwebtoken @types/jsonwebtoken

# Set JWT secret
wrangler secret put JWT_SECRET
```

**Implementation:**
```typescript
// src/lib/auth/jwt.ts
import jwt from 'jsonwebtoken';

interface JWTPayload {
  email: string;
  role: 'admin' | 'user';
  exp: number;
}

export function generateToken(email: string, role: 'admin' | 'user'): string {
  const secret = process.env.JWT_SECRET!;
  const expiresIn = '24h';

  return jwt.sign({ email, role }, secret, { expiresIn });
}

export function verifyToken(token: string): JWTPayload {
  const secret = process.env.JWT_SECRET!;

  try {
    return jwt.verify(token, secret) as JWTPayload;
  } catch (error) {
    throw new UnauthorizedError('Invalid token');
  }
}

export function extractToken(request: Request): string | null {
  const authHeader = request.headers.get('Authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  return authHeader.substring(7);
}
```

**API Route Protection:**
```typescript
// src/app/api/games/route.ts
export async function GET(request: NextRequest) {
  // Extract and verify JWT
  const token = extractToken(request);
  if (!token) {
    return new Response('Unauthorized', { status: 401 });
  }

  const payload = verifyToken(token);

  // Proceed with authenticated request
  // ...
}
```

### 2.3 Hybrid Approach (Recommended for Transition)

Use Cloudflare Access for browser-based admin UI and JWT for API clients:

```typescript
// src/lib/auth/hybrid.ts
export function authenticate(request: Request): { email: string; method: string } {
  // Check Cloudflare Access header first
  const cfEmail = request.headers.get('CF-Access-Authenticated-User-Email');
  if (cfEmail) {
    return { email: cfEmail, method: 'cloudflare-access' };
  }

  // Fallback to JWT
  const token = extractToken(request);
  if (token) {
    const payload = verifyToken(token);
    return { email: payload.email, method: 'jwt' };
  }

  throw new UnauthorizedError('Authentication required');
}
```

## 3. Authorization Patterns

### 3.1 Role-Based Access Control (RBAC)
```typescript
// src/lib/auth/rbac.ts
export enum Role {
  Admin = 'admin',
  User = 'user',
  Guest = 'guest',
}

export interface User {
  email: string;
  role: Role;
}

export function hasPermission(user: User, requiredRole: Role): boolean {
  const roleHierarchy = {
    [Role.Guest]: 0,
    [Role.User]: 1,
    [Role.Admin]: 2,
  };

  return roleHierarchy[user.role] >= roleHierarchy[requiredRole];
}

export function requireRole(role: Role) {
  return (handler: Function) => async (request: Request, ...args: any[]) => {
    const user = authenticate(request);

    if (!hasPermission(user, role)) {
      return new Response('Forbidden', { status: 403 });
    }

    return handler(request, ...args);
  };
}
```

### 3.2 Admin List Management
```typescript
// Store in D1
CREATE TABLE admins (
  email TEXT PRIMARY KEY,
  created_at TEXT DEFAULT (datetime('now')),
  created_by TEXT
);

// Query in application
export async function isAdmin(env: Env, email: string): Promise<boolean> {
  const result = await env.DB
    .prepare('SELECT email FROM admins WHERE email = ?')
    .bind(email)
    .first();

  return result !== null;
}

// Or use environment variable for simplicity
export function isAdmin(email: string): boolean {
  const adminEmails = (process.env.ADMIN_EMAILS || '').split(',');
  return adminEmails.includes(email);
}
```

## 4. Migration Steps

### 4.1 Phase 1: Preparation
```typescript
// 1. Identify all auth-related code
// Files to update:
// - src/utils/supabase/server.ts
// - src/utils/supabase/client.ts
// - src/utils/supabase/middleware.ts
// - src/utils/auth.ts
// - src/middleware.ts

// 2. Document current auth flows
// - Admin login
// - Session management
// - Protected routes
// - API authentication
```

### 4.2 Phase 2: Implementation
```typescript
// 1. Create new auth utilities
// src/lib/auth/cloudflare-access.ts
// src/lib/auth/jwt.ts (if using JWT)
// src/lib/auth/rbac.ts

// 2. Update middleware
// src/middleware.ts
export function middleware(request: NextRequest) {
  // New Cloudflare Access logic
  const email = request.headers.get('CF-Access-Authenticated-User-Email');

  if (!email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Check admin status
  if (!isAdmin(email)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Add user info to request headers for downstream use
  const response = NextResponse.next();
  response.headers.set('X-User-Email', email);
  return response;
}

// 3. Update API routes
// Replace: const supabase = createClient(); await checkAdmin(supabase);
// With: const email = requireAuth(request);
```

### 4.3 Phase 3: Remove Supabase Auth
```typescript
// 1. Remove Supabase auth calls
// - Remove src/utils/supabase/server.ts
// - Remove src/utils/supabase/client.ts
// - Remove src/utils/supabase/middleware.ts
// - Update src/utils/auth.ts

// 2. Remove dependencies
// package.json
// - "@supabase/ssr"
// - "@supabase/supabase-js"

// 3. Update environment variables
// Remove:
// - NEXT_PUBLIC_SUPABASE_URL
// - NEXT_PUBLIC_SUPABASE_ANON_KEY

// Add (if using JWT):
// - JWT_SECRET
// - ADMIN_EMAILS
```

## 5. Testing Strategy

### 5.1 Unit Tests
```typescript
// Test authentication utilities
describe('Cloudflare Access Auth', () => {
  it('should extract email from CF header', () => {
    const request = new Request('https://example.com', {
      headers: {
        'CF-Access-Authenticated-User-Email': 'admin@example.com',
      },
    });

    const email = getAuthenticatedUser(request);
    expect(email).toBe('admin@example.com');
  });

  it('should return null if no CF header', () => {
    const request = new Request('https://example.com');
    const email = getAuthenticatedUser(request);
    expect(email).toBeNull();
  });

  it('should verify admin status', () => {
    process.env.ADMIN_EMAILS = 'admin@example.com,super@example.com';

    expect(isAdmin('admin@example.com')).toBe(true);
    expect(isAdmin('user@example.com')).toBe(false);
  });
});
```

### 5.2 Integration Tests
```typescript
// Test protected API routes
describe('Protected API Routes', () => {
  it('should reject requests without auth', async () => {
    const response = await fetch('http://localhost:3000/api/games', {
      method: 'POST',
      body: JSON.stringify({ title: 'Chess' }),
    });

    expect(response.status).toBe(401);
  });

  it('should accept requests with valid CF header', async () => {
    const response = await fetch('http://localhost:3000/api/games', {
      method: 'POST',
      headers: {
        'CF-Access-Authenticated-User-Email': 'admin@example.com',
      },
      body: JSON.stringify({ title: 'Chess' }),
    });

    expect(response.status).toBe(201);
  });
});
```

## 6. Security Considerations

### 6.1 Header Validation
```typescript
// IMPORTANT: In production, ensure Cloudflare Access is configured
// to prevent header spoofing

// Cloudflare Access automatically adds and validates these headers
// But verify that your application is behind Cloudflare Access

export function validateCloudflareAccess(request: Request): boolean {
  // Check for Cloudflare Access JWT token
  const cfToken = request.headers.get('Cf-Access-Jwt-Assertion');

  if (!cfToken) {
    // Not behind Cloudflare Access
    return false;
  }

  // Optionally validate JWT signature
  // (Cloudflare does this automatically, but you can double-check)
  return true;
}
```

### 6.2 CORS Configuration
```typescript
// Configure CORS for API access
export function corsHeaders(origin: string) {
  const allowedOrigins = [
    'https://crb.kadragon.work',
    'http://localhost:3000', // Development
  ];

  if (!allowedOrigins.includes(origin)) {
    return {};
  }

  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
  };
}
```

### 6.3 Rate Limiting
```typescript
// Implement rate limiting for authentication attempts
import { RateLimit } from '@/lib/rate-limit';

const authRateLimit = new RateLimit({
  interval: 60 * 1000, // 1 minute
  maxRequests: 10,
});

export async function handleAuth(request: Request) {
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';

  if (!authRateLimit.check(ip)) {
    return new Response('Too many requests', { status: 429 });
  }

  // Proceed with authentication
}
```

## 7. Rollback Plan

### 7.1 Keep Supabase Auth as Fallback
```typescript
// During transition, support both methods
export async function authenticateHybrid(request: Request) {
  // Try Cloudflare Access first
  const cfEmail = request.headers.get('CF-Access-Authenticated-User-Email');
  if (cfEmail) {
    return { email: cfEmail, provider: 'cloudflare' };
  }

  // Fallback to Supabase
  const supabase = createClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (user) {
    return { email: user.email, provider: 'supabase' };
  }

  throw new UnauthorizedError('Authentication required');
}
```

### 7.2 Feature Flag
```typescript
// Use feature flag to toggle between auth methods
const USE_CLOUDFLARE_ACCESS = process.env.USE_CLOUDFLARE_ACCESS === 'true';

export function authenticate(request: Request) {
  if (USE_CLOUDFLARE_ACCESS) {
    return authenticateCloudflareAccess(request);
  } else {
    return authenticateSupabase(request);
  }
}
```

## 8. Documentation Updates

### 8.1 Admin Setup Guide
```markdown
# Admin Setup

## For Development
1. Set environment variable:
   ```bash
   export ADMIN_EMAILS="your-email@example.com"
   ```

2. Use local development without Cloudflare Access:
   ```bash
   wrangler dev --local
   ```

## For Production
1. Configure Cloudflare Access in dashboard:
   - Navigate to Zero Trust > Access > Applications
   - Add application for your domain
   - Configure identity provider (Google, GitHub, etc.)
   - Add access policy for admin emails

2. Deploy with Access enabled:
   ```bash
   npm run deploy
   ```

3. Access the application - you'll be prompted to authenticate
```

### 8.2 API Client Guide
```markdown
# API Authentication

## Browser-based Access
- Automatic via Cloudflare Access
- No additional headers needed

## Programmatic Access (if JWT enabled)
1. Obtain JWT token:
   ```bash
   curl -X POST https://crb.kadragon.work/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email": "admin@example.com", "password": "..."}'
   ```

2. Use token in requests:
   ```bash
   curl https://crb.kadragon.work/api/games \
     -H "Authorization: Bearer YOUR_JWT_TOKEN"
   ```
```

## 9. Monitoring and Logging

### 9.1 Auth Event Logging
```typescript
// Log authentication events
export function logAuthEvent(
  event: 'login' | 'logout' | 'unauthorized' | 'forbidden',
  email: string | null,
  request: Request
) {
  console.log(JSON.stringify({
    event,
    email,
    ip: request.headers.get('CF-Connecting-IP'),
    userAgent: request.headers.get('User-Agent'),
    timestamp: new Date().toISOString(),
  }));
}
```

### 9.2 Audit Trail
```sql
-- Store auth events in D1
CREATE TABLE auth_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event TEXT NOT NULL,
  email TEXT,
  ip_address TEXT,
  user_agent TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX idx_auth_events_email ON auth_events(email);
CREATE INDEX idx_auth_events_created_at ON auth_events(created_at);
```

## 10. Best Practices

### 10.1 DO
✓ Use HTTPS everywhere (automatic with Cloudflare)
✓ Validate authentication on every protected route
✓ Log authentication events for audit trail
✓ Use role-based access control
✓ Implement rate limiting
✓ Rotate JWT secrets regularly (if using JWT)
✓ Use environment variables for sensitive config

### 10.2 DON'T
✗ Don't trust client-provided headers without validation
✗ Don't store passwords in plain text
✗ Don't expose sensitive endpoints without auth
✗ Don't use weak JWT secrets
✗ Don't skip authentication checks in middleware
✗ Don't log sensitive information (passwords, tokens)
✗ Don't implement custom crypto (use standard libraries)
