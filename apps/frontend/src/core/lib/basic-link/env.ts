export const env = {
  get NEXT_PUBLIC_API_BASE_URL() {
    return process.env.NEXT_PUBLIC_API_BASE_URL;
  },

  get NEXT_PUBLIC_BACK_URL() {
    return process.env.NEXT_PUBLIC_BACK_URL;
  },

  get INTERNAL_API_BASE_URL() {
    return process.env.INTERNAL_API_BASE_URL;
  },

  get NODE_ENV() {
    return process.env.NODE_ENV ?? 'development';
  },
} as const;