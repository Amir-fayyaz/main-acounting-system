import type { Metadata } from 'next';

import { DemoPage } from '@/core/features/demo/components/block/demo-page/DemoPage';
import SectionLayout from '@/core/components/custom/ui/wrapper/SectionLayout';

export const metadata: Metadata = {
  title: 'دموی تعاملی — تراز',
  description:
    'یک دور تعاملی با تراز: داشبورد مالی، جریان خرید و فروش و بررسی پیشنهاد تطبیق بانکی با داده‌های نمونه.',
};

export default function DemoRoute() {
  return (
    <SectionLayout>
      <DemoPage />
    </SectionLayout>
  );
}
