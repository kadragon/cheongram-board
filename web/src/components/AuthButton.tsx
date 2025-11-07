"use client";

import { Button } from './ui/button';
import { Link } from 'react-router-dom';
import { AddGameDialog } from './AddGameDialog';

/**
 * AuthButton component for Cloudflare Access
 *
 * In production, authentication is handled by Cloudflare Access.
 * This component simply provides navigation to admin features.
 *
 * For local development, set X-Dev-User-Email header and ensure
 * the email is in ADMIN_EMAILS environment variable.
 */
export function AuthButton() {
  // In Cloudflare Access setup, admin users are determined by CF-Access headers
  // This component assumes if the user can access the page, they may be an admin
  // The actual admin check happens at the API level

  return (
    <div className="flex items-center gap-2">
      <AddGameDialog />
      <Link to="/admin">
        <Button variant="outline">Admin Page</Button>
      </Link>
    </div>
  );
}
