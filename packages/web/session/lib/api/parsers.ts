import { z } from 'zod';
import type { SessionResponse } from '../../assets/@types/session.types';

const principalSchema = z.object({
  userId: z.string(),
  displayName: z.string(),
  email: z.string(),
});

const sessionResponseSchema = z.object({
  sessionId: z.string(),
  expiresAt: z.string(),
  principal: principalSchema,
});

export function parseSessionResponse(data: unknown): SessionResponse {
  return parseResponse(sessionResponseSchema, data);
}

function parseResponse<T>(schema: z.ZodType<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw new TypeError('The API response does not match the expected contract.');
  }

  return result.data;
}