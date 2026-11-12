import type { Metadata } from 'next';
import { PeoplePage } from '@/core/features/people';

export const metadata: Metadata = { title: 'مشتریان و تأمین‌کنندگان' };

export default function Page() {
  return <PeoplePage />;
}
