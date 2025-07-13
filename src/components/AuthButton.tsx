"use client";

import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Button } from './ui/button';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export function AuthButton() {
  const supabase = createClient();
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUser(session.user);
        const { data: userDetails } = await supabase
          .from('users')
          .select('is_admin')
          .eq('id', session.user.id)
          .single();
        setIsAdmin(userDetails?.is_admin || false);
      }
    };
    checkUser();
  }, [supabase]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setIsAdmin(false);
  };

  if (isAdmin) {
    return (
      <div className="flex gap-2">
        <Link href="/admin">
          <Button variant="outline">Admin Page</Button>
        </Link>
        <Button onClick={handleLogout}>Logout</Button>
      </div>
    );
  }

  return (
    <Link href="/login">
      <Button variant="outline">Admin Login</Button>
    </Link>
  );
}
