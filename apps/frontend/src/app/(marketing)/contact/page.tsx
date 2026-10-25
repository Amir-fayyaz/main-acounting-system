import type { Metadata } from 'next';
import { ContactPage } from '@/core/features/landing/components/block/contact/ContactPage';

export const metadata: Metadata = {
  title: 'تماس با تراز',
  description: 'برای پرسش درباره محصول، انتخاب پلن یا شروع همکاری با تراز تماس بگیرید.',
};

export default function ContactRoute() {
  return <ContactPage />;
}
