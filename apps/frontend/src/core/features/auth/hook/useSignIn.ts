'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import type { SignInResponse } from '../assets/@types/auth.types';
import { signInApi } from '../lib/auth-api';
import { setAuthToken } from '../lib/auth-storage';
import { mapAuthError } from '../utils/mapAuthError';

export const AFTER_SIGN_IN_PATH = '/';

const SESSION_SAVE_ERROR = 'ورود انجام شد اما ذخیره‌ی نشست ناموفق بود. دوباره تلاش کنید.';

export function useSignIn() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function fail(message: string) {
    setError(message);
    toast.error(message);
    setLoading(false);
    return false;
  }

  async function signIn(input: { email: string; password: string; remember?: boolean }) {
    setLoading(true);
    setError(null);

    let res: SignInResponse;
    try {
      res = await signInApi({ email: input.email, password: input.password });
    } catch (error: unknown) {
      return fail(mapAuthError(error));
    }

    // session در بک‌اند ساخته شده؛ شکست ذخیره‌ی کوکی را جدا از خطای اعتبارسنجی گزارش می‌کنیم.
    try {
      await setAuthToken(res.token, res.expiresAt, input.remember ?? false);
    } catch {
      return fail(SESSION_SAVE_ERROR);
    }

    toast.success('ورود موفق بود. در حال انتقال به پنل...');
    router.push(AFTER_SIGN_IN_PATH);
    router.refresh();
    setLoading(false);
    return true;
  }

  return { signIn, loading, error };
}
