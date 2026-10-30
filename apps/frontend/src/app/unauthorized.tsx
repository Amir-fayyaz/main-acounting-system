import { ErrorPresentation } from '@repo/web/ui';

export default function Unauthorized() {
  return <ErrorPresentation type={401} />;
}
