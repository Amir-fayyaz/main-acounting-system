'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';

export function useSignOut() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function signOut() {
    setLoading(true);
    try {
      // Clear any auth cookies or tokens if needed
      // For now just navigate to login
      router.replace('/login');
      router.refresh();
      toast.success('با موفقیت خارج شدید');
    } catch {
      toast.error('خطا در خروج از حساب کاربری');
    } finally {
      setLoading(false);
    }
  }

  return { signOut, loading };
}
