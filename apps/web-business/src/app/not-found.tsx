'use client';

import { ErrorPresentation } from '@repo/web/ui';

export default function NotFound() {
  return (
    <ErrorPresentation
      type={404}
      onHome={() => window.location.assign('/')}
      onBack={() => window.history.back()}
    />
  );
}
