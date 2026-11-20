import type {
  CreatePosTerminalRequest,
  PosTerminalFormValues,
} from '../assets/@types/pos-terminal.types';
import { normalizeFeeInput } from '../utils/fee';

export function createEmptyPosTerminalFormValues(): PosTerminalFormValues {
  return {
    title: '',
    terminalNumber: '',
    merchantNumber: '',
    bank: '',
    feePercent: '',
  };
}

/** فرم ایجاد را به payload استاندارد API تبدیل می‌کند. */
export function mapPosFormValuesToCreateRequest(
  values: PosTerminalFormValues,
): CreatePosTerminalRequest {
  const feePercent = values.feePercent ? normalizeFeeInput(values.feePercent) : null;

  return {
    title: values.title.trim(),
    terminalNumber: values.terminalNumber.trim(),
    merchantNumber: values.merchantNumber.trim() || null,
    bank: values.bank.trim() || null,
    feePercent,
  };
}
