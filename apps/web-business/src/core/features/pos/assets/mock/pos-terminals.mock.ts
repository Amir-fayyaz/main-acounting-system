import type { PosStatus, PosTerminalDto } from '../@types/pos-terminal.types';
import { POS_BANKS } from '../../lib/pos.config';

const BRANCHES = ['دفتر مرکزی', 'شعبه ونک', 'شعبه اصفهان', 'شعبه تبریز'] as const;

const FEES = ['0.50', '0.70', '1.00'] as const;

const ACTIVATION_DATES = [
  '1404/01/15',
  '1404/02/03',
  '1404/03/21',
  '1404/04/10',
  '1404/05/02',
  '1404/05/28',
  '1404/06/14',
  '1404/07/01',
  '1404/08/19',
  '1404/09/05',
  '1404/10/22',
  '1404/11/11',
] as const;

function buildIban(index: number): string {
  // IR + 24 رقم؛ بدون استفاده از number تا نمایش نمایی رخ ندهد.
  const accountPart = String(index + 1).padStart(6, '0');

  return `IR${accountPart}000000000000000000`;
}

function resolveStatus(index: number): PosStatus {
  return index % 5 === 4 ? 'inactive' : 'active';
}

/** حداقل ۲۴ ترمینال نمایشی با تنوع بانک، کارمزد، تاریخ فعال‌سازی و وضعیت. */
export function createMockPosTerminalDtos(): PosTerminalDto[] {
  return Array.from({ length: 28 }, (_, index) => ({
    id: `pos-${String(1001 + index).padStart(4, '0')}`,
    revision: 1 + (index % 2),
    title: `POS ${BRANCHES[index % BRANCHES.length] ?? 'دفتر مرکزی'}`,
    terminalNumber: String(10000000 + index * 137),
    merchantNumber: String(1000000000 + index * 977),
    bank: POS_BANKS[index % POS_BANKS.length] ?? 'ملی',
    feePercent: FEES[index % FEES.length] ?? '0.50',
    settlementIban: buildIban(index),
    activatedOn: ACTIVATION_DATES[index % ACTIVATION_DATES.length] ?? '1404/01/15',
    status: resolveStatus(index),
  }));
}
