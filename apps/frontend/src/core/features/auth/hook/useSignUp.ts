"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import type { AuthApiError, SignUpInput } from "../assets/@types/auth.types";
import { signUpApi } from "../lib/auth-api";
import { mapAuthError } from "../utils/mapAuthError";

export const AFTER_SIGN_UP_PATH = "/login";

export function useSignUp() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function signUp(input: SignUpInput): Promise<boolean> {
    setLoading(true);

    try {
      await signUpApi(input);

      router.push(AFTER_SIGN_UP_PATH);
      return true;
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
