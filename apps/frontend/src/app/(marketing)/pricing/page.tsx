import type { Metadata } from 'next';

import { PricingPage } from '@/core/features/landing/components/block/pricing/PricingPage';

export const metadata: Metadata = {
  title: 'تعرفه‌ها و پلن‌ها',
  description: 'پلن‌های تراز برای تیم‌های مختلف؛ مقایسه ظرفیت‌ها و انتخاب تعرفه مناسب.',
};

export default function PricingRoute() {
  return <PricingPage />;
}
