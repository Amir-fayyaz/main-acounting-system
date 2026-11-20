// Public API for shared. Add page components and hooks here as they are implemented.

// Types
export type {
  CurrencyCode,
  CreateResult,
  ListParams,
  Money,
  MoneyAmount,
} from './assets/@types/common';

// Digits & number separators
export {
  DECIMAL_SEPARATOR,
  THOUSANDS_SEPARATOR,
  formatCountFa,
  padFaDay,
  toAsciiDigits,
  toFaDigits,
} from './utils/persian-digits';

// Money
export { formatMoney, formatMoneyFa } from './utils/format-money';
export { isCanonicalMoney, isPositiveMoney, normalizeMoneyInput } from './utils/money-input';
export { formatShortMoney, splitShortMoney } from './utils/format-short-money';

// Dates
export {
  addJalaliDays,
  addJalaliDaysToDate,
  daysInJalaliMonth,
  formatJalaliDateFa,
  formatJalaliParts,
  isJalaliLeapYear,
  normalizeJalaliDate,
  parseJalaliDate,
  todayJalali,
} from './utils/jalali';
export type { JalaliDateParts } from './utils/jalali';

// Bank account numbers
export { normalizeIban } from './utils/iban';

// Validation
export { mapZodErrorsToKnownFields } from './lib/map-zod-errors';

// Form & panel UI
export { FormField } from './components/ui/FormField';
export { Notice } from './components/ui/Notice';
export type { NoticeTone } from './components/ui/Notice';
export { PrintButton } from './components/ui/PrintButton';
export { PrintStyles } from './components/ui/PrintStyles';

// Mock
export {
  makeMoney,
  createId,
  filterMockRows,
  paginateMockRows,
  waitForMockResponse,
} from './assets/mock/mock-utils';
export { listMockRows } from './lib/mock-api-utils';
