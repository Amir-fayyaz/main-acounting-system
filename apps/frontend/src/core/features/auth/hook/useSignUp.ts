"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import type { AuthApiError, SignUpInput } from "../assets/@types/auth.types";
import { signInApi, signUpApi } from "../lib/auth-api";
import { setAuthToken } from "../lib/auth-storage";
import { mapAuthError } from "../utils/mapAuthError";

export const AFTER_SIGN_UP_PATH = "/";

export function useSignUp() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function signUp(input: SignUpInput): Promise<boolean> {
    setLoading(true);

    try {
      await signUpApi(input);

      try {
        const res = await signInApi({
          email: input.email,
          password: input.password,
        });

        await setAuthToken(res.token, res.expiresAt, false);

        toast.success("ثبت‌نام و ورود با موفقیت انجام شد. در حال انتقال به پنل...");
        router.push(AFTER_SIGN_UP_PATH);
        router.refresh();

        return true;
      } catch {
        toast.success("ثبت‌نام با موفقیت انجام شد.");
        toast.info("برای ورود به حساب، لطفاً اطلاعات خود را وارد کنید.");
        router.push("/login");

        return true;
      }
    } catch (e) {
      const message = mapAuthError(e as AuthApiError);
      toast.error(message);
      return false;
    } finally {
      setLoading(false);
    }
  }

  return { signUp, loading };
}