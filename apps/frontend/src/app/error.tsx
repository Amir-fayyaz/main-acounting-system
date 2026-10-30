'use client';

import { ErrorPresentation } from '@repo/web/ui';

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <ErrorPresentation type={500} retry={reset} />;
}
