'use client';

import { useState, useEffect } from 'react';

export interface User {
  userId: string;
  name: string;
  email: string;
}

export function useUser(): User | null {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/organizations/me');
        if (!res.ok) return;
        const data = await res.json();
        setUser({
          userId: data.user?.userId ?? '',
          name: data.user?.name ?? 'User',
          email: data.user?.email ?? '',
        });
      } catch {
        // unauthenticated
      }
    };
    void load();
  }, []);

  return user;
}