import SectionLayout from '@/core/components/custom/ui/wrapper/SectionLayout';
import { Suspense } from 'react';
import { ContactForm } from '@/core/features/landing/components/block/contact/form/ContactForm';
import { ContactHero } from '@/core/features/landing/components/block/contact/hero/ContactHero';
import { ContactPaths } from '@/core/features/landing/components/block/contact/paths/ContactPaths';

export function ContactPage() {
  return (
    <main>
      <ContactHero />
      <SectionLayout className="pt-0">
        <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-16">
          <ContactPaths />
          <Suspense fallback={null}>
            <ContactForm />
          </Suspense>
        </div>
      </SectionLayout>
    </main>
  );
}
