import { BASE_URL } from "@/core/lib/basic-link/BackendBasicLink";
import type {
  SessionResponse,
  SignInInput,
  SignInResponse,
} from "../assets/@types/auth.types";

const AUTH_PREFIX = `${BASE_URL}/v1/auth`;

async function failure(res: Response) {
  const data = await res.json().catch(() => null);
  return { status: res.status, body: data };
}

export async function signInApi(body: SignInInput): Promise<SignInResponse> {
  const res = await fetch(`${AUTH_PREFIX}/sign-in`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw await failure(res);
  return res.json();
}

export async function getSessionApi(token: string): Promise<SessionResponse> {
  const res = await fetch(`${AUTH_PREFIX}/session`, {
    method: "GET",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  });
  if (!res.ok) throw await failure(res);
  return res.json();
}

export async function signOutApi(token: string): Promise<void> {
  const res = await fetch(`${AUTH_PREFIX}/sign-out`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
 if (!res.ok) throw await failure(res);
}
