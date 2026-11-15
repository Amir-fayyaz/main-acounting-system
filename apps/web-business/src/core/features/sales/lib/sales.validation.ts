import type { CreateSaleInput } from '../assets/@types/sale';

export type SaleFormErrors = Partial<Record<keyof CreateSaleInput, string>>;

export function validateSaleForm(values: CreateSaleInput): SaleFormErrors {
  const errors: SaleFormErrors = {};
  if (!values.cust) errors.cust = 'انتخاب مشتری الزامی است.';
  if (!values.seller) errors.seller = 'انتخاب فروشنده الزامی است.';
  const gross = Number(values.gross);
  if (!Number.isFinite(gross) || gross <= 0) errors.gross = 'مبلغ ناخالص باید بیشتر از صفر باشد.';
  return errors;
}
