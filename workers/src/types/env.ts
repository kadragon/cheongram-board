// Trace: SPEC-migration-workers-1, TASK-workers-001.1

/**
 * Cloudflare Workers Environment Bindings
 *
 * This interface defines all environment variables and bindings
 * available in the Workers runtime.
 */
export interface Env {
  // D1 Database binding
  DB: D1Database;

  // Environment variables
  NODE_ENV: string;
  ADMIN_EMAILS: string; // Comma-separated list of admin emails

  // Optional: KV for future use
  // KV?: KVNamespace;
}

/**
 * Hono Context Variables
 *
 * Variables that can be stored in the Hono context during request processing.
 */
export interface Variables {
  userEmail?: string;
}
