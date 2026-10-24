'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import type { AuthApiError, SignUpInput } from '../assets/@types/auth.types';
import { signInApi, signUpApi } from '../lib/auth-api';
import { setAuthToken } from '../lib/auth-storage';
import { mapAuthError, mapSignUpFieldErrors, type SignUpFieldErrors } from '../utils/mapAuthError';

export const AFTER_SIGN_UP_PATH = '/';

export type SignUpResult = { ok: true } | { ok: false; fieldErrors: SignUpFieldErrors };

/** ورود خودکار بعد از ثبت‌نام (best-effort): sign-up خودش session نمی‌سازد. */
async function tryAutoSignIn({ email, password }: SignUpInput): Promise<boolean> {
  try {
    const res = await signInApi({ email, password });
    await setAuthToken(res.token, res.expiresAt, false);
    return true;
  } catch {
    return false;
  }
}

export function useSignUp() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function signUp(input: SignUpInput): Promise<SignUpResult> {
    setLoading(true);

    try {
      await signUpApi(input);
    } catch (e) {
      const err = e as AuthApiError;
      toast.error(mapAuthError(err));
      setLoading(false);
      return { ok: false, fieldErrors: mapSignUpFieldErrors(err) };
    }

    // ثبت‌نام موفق بود؛ از اینجا به بعد هیچ خطایی نباید آن را «شکست» نشان دهد.
    // loading عمداً روشن می‌ماند تا هنگام ریدایرکت دوباره submit نشود.
    if (await tryAutoSignIn(input)) {
      toast.success('ثبت‌نام و ورود با موفقیت انجام شد. در حال انتقال به پنل...');
      router.push(AFTER_SIGN_UP_PATH);
      router.refresh();
    } else {
      toast.success('ثبت‌نام با موفقیت انجام شد. برای ادامه وارد شوید.');
      router.push('/login');
    }

    return { ok: true };
  }

  return { signUp, loading };
}
