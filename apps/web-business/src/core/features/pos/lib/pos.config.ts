import type { PosStatus } from '../assets/@types/pos-terminal.types';

export const POS_STATUS_LABELS: Record<PosStatus, string> = {
  active: 'فعال',
  inactive: 'غیرفعال',
};

export interface PosSelectOption<TValue extends string> {
  value: TValue;
  label: string;
}

export const POS_STATUS_OPTIONS: readonly PosSelectOption<PosStatus>[] = (
  Object.entries(POS_STATUS_LABELS) as [PosStatus, string][]
).map(([value, label]) => ({ value, label }));

/** اندازه‌های صفحه مطابق طراحی pos.html. */
export const POS_PAGE_SIZES = [10, 20, 50] as const;

export const POS_BANKS = ['ملی', 'ملت', 'سامان', 'پاسارگاد', 'صادرات'] as const;
