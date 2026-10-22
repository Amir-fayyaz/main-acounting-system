import { Suspense } from 'react';
import ContactHero from '@/core/components/custom/blook/contact/contactHero/ContactHero';
import ContactLayout from '@/core/components/custom/blook/contact/contactLayout/ContactLayout';

export default function ContactPage() {
  return (
    <main className="font-[family-name:var(--font-vazirmatn)]">
      <div className="pages-container">
        <ContactHero />
        
        <Suspense fallback={null}>
          <ContactLayout />
        </Suspense>
      </div>
    </main>
  );
}
