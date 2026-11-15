import { normalizeIban, normalizeJalaliDate, toAsciiDigits } from '../../shared';
import type {
  CreatePosTerminalRequest,
  PosTerminal,
  PosTerminalDto,
} from '../assets/@types/pos-terminal.types';
import { isCanonicalFee, normalizeFeeInput } from '../utils/fee';
import { PosApiError } from './pos-api.errors';

function normalizeDigits(value: string): string {
  return toAsciiDigits(value).trim();
}

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
    terminalNumber: normalizeDigits(dto.terminalNumber),
    merchantNumber: dto.merchantNumber ? normalizeDigits(dto.merchantNumber) : null,
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

export function mapCreatePosTerminalRequestToDto(
  payload: CreatePosTerminalRequest,
  id: string,
): PosTerminalDto {
  return {
    id,
    revision: 1,
    title: payload.title.trim(),
    terminalNumber: normalizeDigits(payload.terminalNumber),
    merchantNumber: payload.merchantNumber ? normalizeDigits(payload.merchantNumber) : null,
    bank: payload.bank?.trim() || null,
    feePercent: payload.feePercent ? normalizeFeeInput(payload.feePercent) : null,
    settlementIban: null,
    activatedOn: null,
    status: 'active',
  };
}
