import type {
  ChequeDirection,
  ChequeDto,
  ChequeFormRules,
  ChequeStatus,
} from '../@types/cheque.types';
import { CHEQUE_BANKS } from '../../lib/checks.config';
import { addJalaliDaysToDate } from '../../utils/jalali';

const COUNTERPARTIES = [
  'شرکت آرمان تجارت',
  'فروشگاه نوید',
  'بازرگانی پارس',
  'احمد کریمی',
  'مریم صادقی',
  'گروه صنعتی البرز',
  'داروخانه مهر',
  'رضا حیدری',
  'پخش سپهر',
  'سارا محمدی',
] as const;

const AMOUNTS = [
  '8500000.00',
  '125000000.00',
  '45000000.00',
  '210000000.00',
  '3500000.50',
  '78000000.00',
  '1250000.00',
] as const;

const STATUS_CYCLE: readonly ChequeStatus[] = [
  'pending',
  'cleared',
  'due-soon',
  'overdue',
  'assigned',
  'returned',
];

/**
 * تاریخ‌های پایه بر اساس وضعیت انتخاب شده‌اند تا سررسیدهای گذشته/آینده با وضعیت ردیف هم‌خوان باشد.
 * تنوع تاریخ‌ها با جابه‌جایی چندروزه در هر ردیف حفظ می‌شود.
 */
const STATUS_DATE_BASE: Record<ChequeStatus, { registered: string; daysToDue: number }> = {
  pending: { registered: '1405/08/01', daysToDue: 45 },
  'due-soon': { registered: '1405/08/05', daysToDue: 6 },
  cleared: { registered: '1405/05/10', daysToDue: 20 },
  returned: { registered: '1405/06/02', daysToDue: 25 },
  overdue: { registered: '1405/06/20', daysToDue: 30 },
  assigned: { registered: '1405/07/10', daysToDue: 60 },
};

export const MOCK_CHEQUE_FORM_RULES: ChequeFormRules = {
  sayad: {
    length: 16,
    pattern: '^\\d{16}$',
  },
  chequeNumber: {
    minLength: 4,
    maxLength: 12,
    pattern: '^\\d{4,12}$',
  },
  duplicateNumberScope: 'bank',
};

function chooseDirection(index: number): ChequeDirection {
  // مستقل از چرخه‌ی وضعیت تا ترکیب‌های «دریافتی/پرداختی × وضعیت» متنوع بماند.
  return (index + Math.floor(index / 6)) % 2 === 0 ? 'received' : 'issued';
}

/** حداقل ۲۴ ردیف با تنوع جهت، وضعیت، بانک و تاریخ برای MVP. */
export function createMockChequeDtos(): ChequeDto[] {
  return Array.from({ length: 28 }, (_, index) => {
    const status = STATUS_CYCLE[index % STATUS_CYCLE.length] ?? 'pending';
    const dateBase = STATUS_DATE_BASE[status];
    const registeredDate =
      addJalaliDaysToDate(dateBase.registered, index % 9) ?? dateBase.registered;
    const dueDate = addJalaliDaysToDate(registeredDate, dateBase.daysToDue) ?? registeredDate;

    return {
      id: `cheque-${String(1001 + index).padStart(4, '0')}`,
      revision: 1 + (index % 2),
      number: String(100000 + index * 371),
      sayadId: String(1200000000000000 + index * 7919),
      direction: chooseDirection(index),
      counterparty: COUNTERPARTIES[index % COUNTERPARTIES.length] ?? 'شرکت آرمان تجارت',
      bank: CHEQUE_BANKS[index % CHEQUE_BANKS.length] ?? 'ملی',
      amount: {
        amount: AMOUNTS[index % AMOUNTS.length] ?? '0.00',
        currency: 'IRR',
      },
      registeredDate,
      dueDate,
      status,
    };
  });
}
