import FaqHero from '@/core/components/custom/blook/faq/faqHero/FaqHero';
import FaqLibrary from '@/core/components/custom/blook/faq/faqLibrary/FaqLibrary';
import MiniCTA from '@/core/components/custom/blook/about/miniCTA/MiniCTA';
import IconDefs from '@/core/components/custom/ui/icons/IconDefs';

export default function FaqPage() {
  return (
    <main className="font-taraz">
      <IconDefs />
      <div className="tz-container">
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
