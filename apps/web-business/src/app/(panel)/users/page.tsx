import type { Metadata } from 'next';
import { UsersPage } from '@/core/features/users';

export const metadata: Metadata = { title: 'کاربران و نقش‌ها' };

export default function UsersPageRoute() {
  return <UsersPage />;

}
