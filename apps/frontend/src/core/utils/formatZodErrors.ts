type ZodErrorLike = {
  issues?: { message?: string }[];
} | null | undefined;

export function formatZodErrors(errors: ZodErrorLike) {
  if (errors && errors.issues && errors.issues.length > 0) {
    return `${errors.issues[0].message}`;
  } else {
    return "خطا در اعتبارسنجی فرم";
  }
}