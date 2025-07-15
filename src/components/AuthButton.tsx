"use client";

import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Button } from './ui/button';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AddGameDialog } from './AddGameDialog';
import type { User } from '@supabase/supabase-js';

export function AuthButton() {
  const supabase = createClient();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const checkUser = async (currentUser: User | null) => {
      if (currentUser) {
        setUser(currentUser);
        // This project uses a custom 'users' table to check for admin status.
        const { data: userDetails } = await supabase
          .from('users')
          .select('is_admin')
          .eq('id', currentUser.id)
          .single();
        setIsAdmin(userDetails?.is_admin || false);
      } else {
        setUser(null);
        setIsAdmin(false);
      }
    };

    // Check initial user state
    supabase.auth.getUser().then(({ data: { user } }) => {
      checkUser(user);
    });

    // Listen for auth state changes
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      checkUser(session?.user ?? null);
      // A page refresh might be needed to correctly update server-side rendered components
      router.refresh();
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [supabase, router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  if (isAdmin) {
    return (
      <div className="flex items-center gap-2">
        <AddGameDialog />
        <Link href="/admin">
          <Button variant="outline">Admin Page</Button>
        </Link>
        <Button onClick={handleLogout}>Logout</Button>
      </div>
    );
  }

  if (user) {
    return (
      <Button onClick={handleLogout}>Logout</Button>
    );
  }

  return (
    <Link href="/login">
      <Button variant="outline">Login</Button>
    </Link>
  );
}
