const backendUrl = process.env.NEXT_PUBLIC_BACK_URL;

if (!backendUrl) {
  throw new Error('NEXT_PUBLIC_BACK_URL is not configured');
}

export const env = {
  NEXT_PUBLIC_BACK_URL: backendUrl,
  NODE_ENV: process.env.NODE_ENV ?? 'development',
} as const;