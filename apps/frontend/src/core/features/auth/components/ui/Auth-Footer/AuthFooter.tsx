import { AuthLink } from '../Auth-Link/AuthLink';

type AuthFooterProps = {
  /** متن قبل از لینک؛ مثلاً «حساب ندارید؟» */
  text?: string;
  href: string;
  linkLabel: string;
};

/** خط پایین فرم: «متن + لینک» */
export function AuthFooter({ text, href, linkLabel }: AuthFooterProps) {
  return (
    <p className="text-muted-foreground mt-5 text-center text-sm">
      {text && <>{text} </>}
      <AuthLink href={href}>{linkLabel}</AuthLink>
    </p>
  );
}
