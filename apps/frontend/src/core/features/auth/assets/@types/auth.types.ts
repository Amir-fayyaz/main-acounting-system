import type { Principal as SharedPrincipal, SessionResponse as SharedSessionResponse } from '@repo/web/session';

export type Principal = SharedPrincipal;
export type SessionResponse = SharedSessionResponse;

export interface SignInResponse {
  token: string;
  tokenType: 'Bearer';
  expiresAt: string; // ISO date-time
  principal: Principal;
}

export type SignInInput = {
  email: string;
  password: string;
};

export interface SignUpInput {
  displayName: string;
  email: string;
  password: string;
}

export interface SignUpResponse {
  id: string;
  displayName: string;
  email: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  revision: number;
}
