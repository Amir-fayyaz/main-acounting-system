import type {
  ContactFieldErrors,
  ContactFieldId,
  ContactFieldValues,
  ContactTopic,
} from '@/core/features/contact/assets/@types/contact';
import {
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from '@repo/web/ui';
import type { Ref } from 'react';

interface ContactFieldsProps {
  values: ContactFieldValues;
  errors: ContactFieldErrors;
  topic: string;
  topics: ContactTopic[];
  nameRef: Ref<HTMLInputElement>;

  onChange: (_id: ContactFieldId, _value: string) => void;

  onTopicChange: (_topic: string) => void;
}

const fieldClass =
  'min-h-[45px] rounded-[6px] border-border! bg-sand-soft! px-3 py-[10px] text-[12px] placeholder:text-muted-foreground! aria-invalid:border-destructive!';
const textareaClass =
  'mt-0! min-h-[132px]! rounded-[6px] border-border! bg-sand-soft! px-3 py-[10px]! text-[12px] leading-[2] placeholder:text-muted-foreground! aria-invalid:border-destructive! [field-sizing:fixed]';

function FieldError({ id, message }: { id: ContactFieldId; message?: string }) {
  return message ? (
    <p className="mt-[5px] text-[10px] leading-[1.9] text-destructive" id={`contact-${id}-error`}>
      {message}
    </p>
  ) : null;
}

export function ContactFields({
  values,
  errors,
  topic,
  topics,
  nameRef,
  onChange,
  onTopicChange,
}: ContactFieldsProps) {
  const input = (
    id: Exclude<ContactFieldId, 'message'>,
    label: string,
    props: {
      type?: string;
      inputMode?: 'email' | 'tel';
      autoComplete: string;
      placeholder: string;
    },
  ) => (
    <div className="mb-[17px]">
      <label className="mb-[7px] block text-[11px] font-semibold" htmlFor={`contact-${id}`}>
        {label}
      </label>
      <Input
        {...props}
        aria-describedby={`contact-${id}-error`}
        aria-invalid={errors[id] ? true : undefined}
        className={fieldClass}
        dir={id === 'name' ? undefined : 'ltr'}
        id={`contact-${id}`}
        maxLength={id === 'name' ? 80 : id === 'email' ? 254 : 20}
        name={id}
        ref={id === 'name' ? nameRef : undefined}
        value={values[id]}
        onChange={(event) => onChange(id, event.target.value)}
      />
      <FieldError id={id} message={errors[id]} />
    </div>
  );

  return (
    <>
      <div className="grid gap-x-[18px] max-[900px]:grid-cols-1 sm:grid-cols-2">
        {input('name', 'نام و نام خانوادگی', {
          autoComplete: 'name',
          placeholder: 'نام شما',
        })}
        {input('email', 'آدرس ایمیل', {
          autoComplete: 'email',
          inputMode: 'email',
          placeholder: 'you@company.com',
          type: 'email',
        })}
        {input('phone', 'شماره موبایل (اختیاری)', {
          autoComplete: 'tel-national',
          inputMode: 'tel',
          placeholder: '0912 345 6789',
          type: 'tel',
        })}
        <div className="mb-[17px]">
          <label className="mb-[7px] block text-[11px] font-semibold" htmlFor="contact-topic">
            موضوع پیام
          </label>
          <Select value={topic} onValueChange={onTopicChange}>
            <SelectTrigger
              className="w-full! min-h-[45px] rounded-[6px] border-border! bg-sand-soft! px-3 py-[10px] text-[12px]"
              id="contact-topic"
              name="topic"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {topics.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="mb-[17px]">
        <label className="mb-[7px] block text-[11px] font-semibold" htmlFor="contact-message">
          پیام شما
        </label>
        <Textarea
          aria-describedby="contact-message-error"
          aria-invalid={errors.message ? true : undefined}
          className={textareaClass}
          id="contact-message"
          maxLength={3000}
          name="message"
          placeholder="کمی از نیاز یا پرسشتان بنویسید…"
          value={values.message}
          onChange={(event) => onChange('message', event.target.value)}
        />
        <FieldError id="message" message={errors.message} />
      </div>
    </>
  );
}
