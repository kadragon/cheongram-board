"use client";

import { Button } from './ui/button';
import { Link } from 'react-router-dom';
import { AddGameDialog } from './AddGameDialog';
import { useAuth } from '@/contexts/AuthContext';

/**
 * AuthButton component for JWT authentication
 *
 * Shows admin features only for authenticated users.
 * - Login button: shown when not authenticated
 * - Add Game + Admin Page: shown when authenticated
 */
export function AuthButton() {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return (
      <div className="flex items-center gap-2">
        <Link to="/login">
          <Button variant="outline">로그인</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <AddGameDialog />
      <Link to="/admin">
        <Button variant="outline">Admin Page</Button>
      </Link>
    </div>
  );
}
