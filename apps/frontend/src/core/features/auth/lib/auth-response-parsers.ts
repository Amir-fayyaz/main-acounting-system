import * as z from 'zod/mini';
import type { SessionResponse, SignInResponse, SignUpResponse } from '../assets/@types/auth.types';

const principalSchema = z.object({
  userId: z.string(),
  displayName: z.string(),
  email: z.string(),
});

const signInResponseSchema = z.object({
  token: z.string(),
  tokenType: z.literal('Bearer'),
  expiresAt: z.string(),
  principal: principalSchema,
});

const sessionResponseSchema = z.object({
  sessionId: z.string(),
  expiresAt: z.string(),
  principal: principalSchema,
});

const signUpResponseSchema = z.object({
  id: z.string(),
  displayName: z.string(),
  email: z.string(),
  status: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  revision: z.number(),
});

export function parseSignInResponse(data: unknown): SignInResponse {
  return parseResponse(signInResponseSchema, data);
}

export function parseSessionResponse(data: unknown): SessionResponse {
  return parseResponse(sessionResponseSchema, data);
}

export function parseSignUpResponse(data: unknown): SignUpResponse {
  return parseResponse(signUpResponseSchema, data);
}

function parseResponse<T>(schema: z.ZodMiniType<T>, data: unknown): T {
  const result = z.safeParse(schema, data);
  if (!result.success) {
    throw new TypeError('The API response does not match the expected contract.');
  }

  return result.data;
}
