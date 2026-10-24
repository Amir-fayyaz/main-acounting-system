import { Suspense } from 'react';
import { ContactForm } from '@/core/features/contact/components/block/contact-form/ContactForm';
import { ContactHero } from '@/core/features/contact/components/block/contact-hero/ContactHero';
import { ContactPaths } from '@/core/features/contact/components/block/contact-paths/ContactPaths';

export function ContactPage() {
  return (
    <main className="font-[family-name:var(--font-vazirmatn)]">
      <div className="pages-container">
        <ContactHero />
        <div className="mb-10 mt-0 grid items-start gap-[31px] max-[900px]:gap-[28px] max-[1100px]:gap-[40px] sm:mb-[60px] sm:mt-[10px] sm:grid-cols-[0.8fr_1.2fr] sm:gap-[65px]">
          <ContactPaths />
          <Suspense fallback={null}>
            <ContactForm />
          </Suspense>
        </div>
      </div>
    </main>
  );
}
