import { H1, Muted } from '@repo/web/ui';

type AuthHeaderProps = {
  title: string;
  description?: string;
};

/** عنوان (h1) و توضیح کوتاه بالای هر فرم auth */
export function AuthHeader({ title, description }: AuthHeaderProps) {
  return (
    <div className="mb-6">
      <H1 className="text-start text-3xl leading-relaxed sm:text-3xl">{title}</H1>
      {description && <Muted className="text-base">{description}</Muted>}
    </div>
  );
}
