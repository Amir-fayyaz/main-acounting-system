import { ErrorPresentation } from '@repo/web/ui';

export default function Forbidden() {
  return <ErrorPresentation type={403} />;
}
