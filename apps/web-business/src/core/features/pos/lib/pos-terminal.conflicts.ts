import type { PosTerminalDto } from '../assets/@types/pos-terminal.types';
import { toAsciiDigits } from '../utils/format';

export const DUPLICATE_TERMINAL_MESSAGE = 'ترمینالی با این شماره قبلاً ثبت شده است.';

function normalizeDigits(value: string): string {
  return toAsciiDigits(value).trim();
}

export function findDuplicateTerminal(
  dtos: readonly PosTerminalDto[],
  terminalNumber: string,
): PosTerminalDto | null {
  const normalized = normalizeDigits(terminalNumber);

  return dtos.find((dto) => normalizeDigits(dto.terminalNumber) === normalized) ?? null;
}
