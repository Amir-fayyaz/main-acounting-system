import FaqHero from '@/core/components/custom/blook/faq/faqHero/FaqHero';
import FaqLibrary from '@/core/components/custom/blook/faq/faqLibrary/FaqLibrary';
import MiniCTA from '@/core/components/custom/blook/about/miniCTA/MiniCTA';

export default function FaqPage() {
  return (
    <main className="font-[family-name:var(--font-vazirmatn)]">
      <div className="pages-container">
        <FaqHero />
        <FaqLibrary />
        <MiniCTA
          buttonHref="/contact"
          buttonLabel="تماس با ما"
          description="از نیاز کسب‌وکارتان بنویسید تا گفت‌وگو را از همان‌جا شروع کنیم."
          title="پرسش دیگری دارید؟"
        />
      </div>
    </main>
  );
}
