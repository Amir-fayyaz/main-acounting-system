import * as z from 'zod/mini';

const paginationMetaSchema = z.object({
  page: z.number(),
  limit: z.number(),
  total: z.number(),
  totalPages: z.number(),
});

const fiscalYearSchema = z.object({
  id: z.string(),
  label: z.string(),
  startDate: z.string(),
  endDate: z.string(),
  status: z.enum(['open', 'closed']),
});

const fiscalPeriodSchema = z.object({
  id: z.string(),
  fiscalYearId: z.string(),
  jalaliYear: z.number(),
  sequence: z.number(),
  startDate: z.string(),
  endDate: z.string(),
  state: z.enum(['open', 'closed']),
});

const membershipSchema = z.object({
  tenantId: z.string(),
  status: z.enum(['active', 'inactive']),
});

const fiscalYearsPageSchema = z.object({
  data: z.array(fiscalYearSchema),
  meta: paginationMetaSchema,
});

const fiscalPeriodsPageSchema = z.object({
  data: z.array(fiscalPeriodSchema),
  meta: paginationMetaSchema,
});

const membershipsPageSchema = z.object({
  data: z.array(membershipSchema),
  meta: paginationMetaSchema,
});

export type FiscalYearDto = z.infer<typeof fiscalYearSchema>;
export type FiscalPeriodDto = z.infer<typeof fiscalPeriodSchema>;

function invalidResponse(): TypeError {
  return new TypeError('Unexpected fiscal-periods response shape.');
}

export function parseFiscalYearsPage(data: unknown): FiscalYearDto[] {
  const result = z.safeParse(fiscalYearsPageSchema, data);
  if (!result.success) throw invalidResponse();

  return result.data.data;
}

export function parseFiscalPeriodsPage(data: unknown): FiscalPeriodDto[] {
  const result = z.safeParse(fiscalPeriodsPageSchema, data);
  if (!result.success) throw invalidResponse();

  return result.data.data;
}

export function parseFiscalPeriod(data: unknown): FiscalPeriodDto {
  const result = z.safeParse(fiscalPeriodSchema, data);
  if (!result.success) throw invalidResponse();

  return result.data;
}

export function parseActiveTenantIds(data: unknown): string[] {
  const result = z.safeParse(membershipsPageSchema, data);
  if (!result.success) throw invalidResponse();

  return result.data.data
    .filter((membership) => membership.status === 'active')
    .map((membership) => membership.tenantId);
}
