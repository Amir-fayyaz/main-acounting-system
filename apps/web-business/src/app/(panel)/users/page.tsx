import type { Metadata } from 'next';
import { UsersContent } from '@/core/features/users/components/UsersContent';

export const metadata: Metadata = { title: 'مدیریت کاربران' };

export default function UsersPage() {
  return <UsersContent />;
}
