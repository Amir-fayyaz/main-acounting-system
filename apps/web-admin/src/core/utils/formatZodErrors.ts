type ZodErrorInput =
  | {
      issues?: Array<{
        message: string;
      }>;
    }
  | null
  | undefined;

const FALLBACK_MESSAGE = 'خطا در اعتبارسنجی فرم';

export function formatZodErrors(errors: ZodErrorInput): string {
  const firstIssue = errors?.issues?.[0];

  return firstIssue?.message ?? FALLBACK_MESSAGE;
}
