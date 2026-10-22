import ContactCopy from './contactCopy/ContactCopy';
import ContactForm from './contactForm/ContactForm';
import { contactPaths, contactTopics } from '../contactData';
import type { ContactPath, ContactTopic } from '../contactData';

export interface ContactLayoutProps {
  title?: string;
  description?: string;
  paths?: ContactPath[];
  topics?: ContactTopic[];
}

function ContactLayout({
  title,
  description,
  paths = contactPaths,
  topics = contactTopics,
}: ContactLayoutProps) {
  return (
    <div className="mb-10 mt-0 grid items-start gap-[31px] max-taraz-xl:gap-[28px] max-taraz-3xl:gap-[40px] sm:mb-[60px] sm:mt-[10px] sm:grid-cols-[0.8fr_1.2fr] sm:gap-[65px]">
      <ContactCopy description={description} paths={paths} title={title} />
      <ContactForm topics={topics} />
    </div>
  );
}

export default ContactLayout;
