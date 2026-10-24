export interface ContactHeroDescriptionProps {
  text?: string;
}

function ContactHeroDescription({
  text = 'سؤال درباره محصول، انتخاب پلن یا شروع همکاری دارید؟ موضوع را انتخاب کنید و پیامتان را بنویسید.',
}: ContactHeroDescriptionProps) {
  return (
    <p className="mx-auto max-w-[570px] text-[12px] leading-[2.1] text-muted-foreground sm:text-[14px]">
      {text}
    </p>
  );
}

export default ContactHeroDescription;
