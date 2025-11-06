/**
 * D1 Database Server Utility
 * Provides access to D1 database instance in Next.js API routes
 *
 * Trace: SPEC-migration-supabase-to-cloudflare-1, TASK-migration-007
 */

import { D1Database } from '@/lib/db/types';
import { D1Adapter } from '@/lib/db';

/**
 * Get D1 database instance from Cloudflare Workers runtime
 *
 * When running on Cloudflare Workers with @opennextjs/cloudflare,
 * the D1 database is accessible through the request context.
 */
export function getDatabase(): D1Database {
  // In Cloudflare Workers environment, D1 is available through process.env
  // This is set up by @opennextjs/cloudflare and the wrangler.toml binding
  const db = (process.env as any).DB as D1Database;

  if (!db) {
    throw new Error('D1 database not available. Ensure DB binding is configured in wrangler.toml');
  }

  return db;
}

/**
 * Get D1 adapter instance for database operations
 *
 * @returns D1Adapter instance configured with the current database
 */
export function getD1Adapter(): D1Adapter {
  const db = getDatabase();
  return new D1Adapter(db);
}
