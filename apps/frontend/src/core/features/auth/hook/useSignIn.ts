"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import type { AuthApiError } from "../assets/@types/auth.types";
import { signInApi } from "../lib/auth-api";
import { setAuthToken } from "../lib/auth-storage";
import { mapAuthError } from "../utils/mapAuthError";

export const AFTER_SIGN_IN_PATH = "/";

export function useSignIn() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function signIn(input: {
    email: string;
    password: string;
    remember?: boolean;
  }) {
    setLoading(true);
    setError(null);
    try {
      const { email, password, remember = false } = input;
      const res = await signInApi({ email, password });
      await setAuthToken(res.token, res.expiresAt, remember);
      toast.success("ورود موفق بود. در حال انتقال به پنل...");
      router.push(AFTER_SIGN_IN_PATH);
      router.refresh();
      return true;
    } catch (e) {
      const message = mapAuthError(e as AuthApiError);
      setError(message);
      toast.error(message);
      return false;
    } finally {
      setLoading(false);
    }
  }

  return { signIn, loading, error };
}
