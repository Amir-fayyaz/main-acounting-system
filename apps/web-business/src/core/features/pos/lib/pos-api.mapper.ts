import type { PosTerminal, PosTerminalDto } from '../assets/@types/pos-terminal.types';
import { normalizeFeeInput, isCanonicalFee } from '../utils/fee';
import { toAsciiDigits } from '../utils/format';
import { normalizeJalaliDate } from '../utils/jalali';
import { PosApiError } from './pos-api.errors';

function normalizeIban(value: string): string {
  return toAsciiDigits(value).replace(/[\s-]/g, '').toUpperCase();
}

/**
 * DTO سرور را به مدل نمایش تبدیل و کارمزد/تاریخ/شبا را canonical می‌کند.
 * داده‌ی ناسازگار با قرارداد به خطای API تبدیل می‌شود تا در حالت error دیده شود.
 */
export function mapPosTerminalDtoToPosTerminal(dto: PosTerminalDto): PosTerminal {
  const feePercent = dto.feePercent === null ? null : normalizeFeeInput(dto.feePercent);
  const activatedOn = dto.activatedOn === null ? null : normalizeJalaliDate(dto.activatedOn);

  if (dto.feePercent !== null && (feePercent === null || !isCanonicalFee(feePercent))) {
    throw new PosApiError({
      message: 'داده‌ی کارمزد ترمینال با قرارداد سازگار نیست.',
      code: 'MALFORMED_RESPONSE',
      status: 500,
    });
  }

  if (dto.activatedOn !== null && activatedOn === null) {
    throw new PosApiError({
      message: 'تاریخ فعال‌سازی ترمینال با قرارداد جلالی سازگار نیست.',
      code: 'MALFORMED_RESPONSE',
      status: 500,
    });
  }

  return {
    id: dto.id,
    revision: dto.revision,
    title: dto.title.trim(),
    terminalNumber: toAsciiDigits(dto.terminalNumber).trim(),
    merchantNumber: dto.merchantNumber ? toAsciiDigits(dto.merchantNumber).trim() : null,
    bank: dto.bank?.trim() || null,
    feePercent,
    settlementIban: dto.settlementIban ? normalizeIban(dto.settlementIban) : null,
    activatedOn,
    status: dto.status,
  };
}

export function mapPosTerminalDtoListToPosTerminals(
  dtos: readonly PosTerminalDto[],
): PosTerminal[] {
  return dtos.map(mapPosTerminalDtoToPosTerminal);
}
