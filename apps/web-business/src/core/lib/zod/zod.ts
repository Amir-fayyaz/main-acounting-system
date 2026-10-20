import * as z from "zod/mini";

// ==================== String ====================
export const ZodString = (
  opts: {
    min?: number;
    max?: number;
    required?: boolean;
    message?: string;
  } = {},
) => {
  const { min = 1, max = 500, required = true, message } = opts;

  let schema = z.string();

  if (required) {
    schema = schema.check(
      z.minLength(min, message || `حداقل ${min} کاراکتر وارد کنید`),
    );
  }

  if (max) {
    schema = schema.check(z.maxLength(max, `حداکثر ${max} کاراکتر`));
  }

  return schema.check(z.trim());
};

export const ZodOptionalString = (max = 500) =>
  z.optional(ZodString({ max, required: false }));

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
  ZodString({ min: 5, max: 100 }).check(z.email("ایمیل وارد شده معتبر نیست"));

// ==================== Phone ====================
export const ZodPhone = () =>
  z.string().check(z.regex(/^(\+98|0)?9\d{9}$/, "شماره موبایل معتبر نیست"));

// ==================== Date ====================
export const ZodDate = (required = true) => {
  const schema = z.date();
  return required ? schema : z.optional(schema);
};

export const ZodOptionalDate = () => ZodDate(false);

// ==================== Enum ====================
export const ZodEnum = <T extends readonly [string, ...string[]]>(
  values: T,
  required = true,
) => {
  const schema = z.enum(values);
  return required ? schema : z.optional(schema);
};

export const ZodOptionalEnum = <T extends readonly [string, ...string[]]>(
  values: T,
) => ZodEnum(values, false);
