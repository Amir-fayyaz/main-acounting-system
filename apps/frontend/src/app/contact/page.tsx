import { Suspense } from 'react';
import ContactHero from '@/core/components/custom/blook/contact/contactHero/ContactHero';
import ContactLayout from '@/core/components/custom/blook/contact/contactLayout/ContactLayout';
import IconDefs from '@/core/components/custom/ui/icons/IconDefs';

export default function ContactPage() {
  return (
    <main className="font-taraz">
      <IconDefs />
      <div className="tz-container">
        <ContactHero />
        
        <Suspense fallback={null}>
          <ContactLayout />
        </Suspense>
      </div>
    </main>
  );
}
