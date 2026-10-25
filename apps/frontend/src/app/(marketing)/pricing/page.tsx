import type { Metadata } from 'next';

import { PricingPage } from '@/core/features/landing/components/block/pricing/PricingPage';
import SectionLayout from '@/core/components/custom/ui/wrapper/SectionLayout';

export const metadata: Metadata = {
  title: 'تعرفه‌ها و پلن‌ها',
  description: 'پلن‌های تراز برای تیم‌های مختلف؛ مقایسه ظرفیت‌ها و انتخاب تعرفه مناسب.',
};

export default function PricingRoute() {
  return (
    <SectionLayout>
      <PricingPage />
    </SectionLayout>
  );
}
