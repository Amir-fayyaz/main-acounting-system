import { env } from './env';

export const BASE_URL = env.NEXT_PUBLIC_API_BASE_URL ?? env.NEXT_PUBLIC_BACK_URL;