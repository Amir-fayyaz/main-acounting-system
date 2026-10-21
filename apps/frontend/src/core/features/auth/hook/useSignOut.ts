"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { signOutAction } from "../lib/auth-storage";

export function useSignOut() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function signOut() {
    setLoading(true);
    try {
      // cookie در هر حال پاک می‌شود؛ حتی اگر API خطا بدهد.
      await signOutAction();
      toast.success("با موفقیت خارج شدید");
    } catch {
      toast.error("خطا در ارتباط با سرور. شما از این دستگاه خارج شدید.");
    } finally {
      setLoading(false);
      router.replace("/login");
      router.refresh();
    }
  }

  return { signOut, loading };
}
