import {
  get,
  set,
  type FieldError,
  type FieldErrors,
  type FieldValues,
  type Resolver,
} from 'react-hook-form';
import * as z from 'zod/mini';

/**
 * اتصال type-safe بین zod/mini و React Hook Form.
 *
 * خروجی موفق، داده‌ی parse شده‌ی Zod را برمی‌گرداند؛ در خروجی ناموفق نیز
 * اولین پیام هر فیلد با مسیر کامل به فرم تحویل داده می‌شود.
 * خطاهای بدون مسیر در errors.root.validation قرار می‌گیرند.
 */
export function zodMiniResolver<TInput extends FieldValues, TOutput extends FieldValues = TInput>(
  schema: z.ZodMiniType<TOutput, TInput>,
): Resolver<TInput, unknown, TOutput> {
  return (values) => {
    const result = z.safeParse(schema, values);

    if (result.success) {
      return { values: result.data, errors: {} };
    }

    const fieldErrors: FieldErrors<TInput> = {};

    for (const issue of result.error.issues) {
      const field = issue.path.length ? issue.path.map(String).join('.') : 'root.validation';
      const existingError = get<FieldErrors<TInput>, FieldError | undefined>(fieldErrors, field);

      if (!existingError?.message) {
        set(fieldErrors, field, {
          ...existingError,
          type: issue.code,
          message: issue.message,
        });
      }
    }

    return {
      values: {},
      errors: fieldErrors,
    };
  };
}

// ==================== String ====================
export const ZodString = (
  opts: {
    min?: number;
    max?: number;
    required?: boolean;
    message?: string;
    maxMessage?: string;
  } = {},
) => {
  const { min = 1, max = 500, required = true, message, maxMessage } = opts;

  // trim باید قبل از min/max اجرا شود تا رشته‌ی فقط-فاصله به‌عنوان مقدار معتبر رد نشود.
  let schema = z.string().check(z.trim());

  if (required) {
    schema = schema.check(z.minLength(min, message || `حداقل ${min} کاراکتر وارد کنید`));
  }

  if (max) {
    schema = schema.check(z.maxLength(max, maxMessage ?? `حداکثر ${max} کاراکتر`));
  }

  return schema;
};

export const ZodOptionalString = (max = 500) => z.optional(ZodString({ max, required: false }));

// ==================== Number ====================
export const ZodNumber = ({
  min,
  max,
  required = true,
}: {
  min?: number;
  max?: number;
  required?: boolean;
} = {}) => {
  let schema = z.number();

  if (min !== undefined) {
    schema = schema.check(z.gte(min, `حداقل مقدار ${min} است`));
  }
  if (max !== undefined) {
    schema = schema.check(z.lte(max, `حداکثر مقدار ${max} است`));
  }

  if (!required) {
    return z.optional(schema);
  }
  return schema;
};

export const ZodOptionalNumber = (opts?: { min?: number; max?: number }) =>
  ZodNumber({ ...opts, required: false });

// ==================== Boolean ====================
export const ZodBoolean = (required = true) => {
  const schema = z.boolean();
  return required ? schema : z.optional(schema);
};

export const ZodOptionalBoolean = () => ZodBoolean(false);

// ==================== Email ====================
export const ZodEmail = () =>
  ZodString({ min: 5, max: 100 }).check(z.email('ایمیل وارد شده معتبر نیست'));

// ==================== Phone ====================
export const ZodPhone = () =>
  z.string().check(z.regex(/^(\+98|0)?9\d{9}$/, 'شماره موبایل معتبر نیست'));

// ==================== Date ====================
export const ZodDate = (required = true) => {
  const schema = z.date();
  return required ? schema : z.optional(schema);
};

export const ZodOptionalDate = () => ZodDate(false);

// ==================== Enum ====================
export const ZodEnum = <T extends readonly [string, ...string[]]>(values: T, required = true) => {
  const schema = z.enum(values);
  return required ? schema : z.optional(schema);
};

export const ZodOptionalEnum = <T extends readonly [string, ...string[]]>(values: T) =>
  ZodEnum(values, false);
