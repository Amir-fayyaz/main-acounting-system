import { SectionLayout } from '@repo/web/ui';
import type { Metadata } from 'next';
import { AboutPage } from '@/core/features/landing/components/block/about/AboutPage';

export const metadata: Metadata = {
  title: 'درباره تراز',
  description: 'با نگاه تراز به حسابداری و اصول ساخت این سامانه آشنا شوید.',
};

export default function AboutRoute() {
  return (
    <SectionLayout>
      <AboutPage />
    </SectionLayout>
  );
}
