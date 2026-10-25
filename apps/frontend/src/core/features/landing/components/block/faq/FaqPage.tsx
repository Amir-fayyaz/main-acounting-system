import { AboutMiniCta } from '@/core/features/landing/components/block/about/cta/AboutMiniCta';
import { FaqHero } from '@/core/features/landing/components/block/faq/hero/FaqHero';
import { FaqLibrary } from '@/core/features/landing/components/block/faq/library/FaqLibrary';

export function FaqPage() {
  return (
    <main className="font-[family-name:var(--font-vazirmatn)]">
      <div className="pages-container">
        <FaqHero />
        <FaqLibrary />
        <AboutMiniCta
          buttonHref="/contact"
          buttonLabel="تماس با ما"
          description="از نیاز کسب‌وکارتان بنویسید تا گفت‌وگو را از همان‌جا شروع کنیم."
          title="پرسش دیگری دارید؟"
        />
      </div>
    </main>
  );
}
