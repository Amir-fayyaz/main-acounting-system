import type { UserStatus } from '../assets/@types/user';

export const USER_ROLE_OPTIONS = [
  'مدیر مالی',
  'حسابدار ارشد',
  'صندوقدار',
  'حسابدار',
  'مدیر شعبه',
  'ناظر (فقط مشاهده)',
] as const;

export type UserRole = (typeof USER_ROLE_OPTIONS)[number];

export const USER_STATUS_LABELS: Record<UserStatus, string> = {
  active: 'فعال',
  inactive: 'غیرفعال',
};
