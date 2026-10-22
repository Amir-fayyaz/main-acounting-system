import ContactPath from './contactPath/ContactPath';
import { contactPaths } from '../../contactData';
import type { ContactPath as ContactPathData } from '../../contactData';

export interface ContactCopyProps {
  title?: string;
  description?: string;
  paths?: ContactPathData[];
}

function ContactCopy({
  title = 'یک گفت‌وگوی خوب،\nاز مسئله واقعی شروع می‌شود.',
  description = 'حجم عملیات، تعداد همکاران و بخشی که بیشترین دوباره‌کاری را دارد، نقطه شروع مناسبی است.',
  paths = contactPaths,
}: ContactCopyProps) {
  const [lead, accent] = title.split('\n');

  return (
    <section>
      <h2 className="mb-[13px] text-[26px] leading-[1.8] tracking-[-0.7px] max-taraz-xl:text-[25px] sm:text-[28px]">
        {lead}
        <br />
        {accent}
      </h2>

      <p className="text-xs leading-[2.2] text-muted-foreground sm:text-[13px]">
        {description}
      </p>

      <div className="mt-5 flex flex-col gap-[15px] max-taraz-sm:mt-[20px] sm:mt-[29px] sm:gap-[17px]">
        {paths.map((path) => (
          <ContactPath {...path} key={path.title} />
        ))}
      </div>
    </section>
  );
}

export default ContactCopy;
