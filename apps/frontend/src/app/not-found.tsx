'use client';

import { ErrorPresentation } from '@repo/web/ui';

export default function NotFound() {
  const onHome = () => {
    if (typeof window !== 'undefined') {
      window.location.assign('/');
    }
  };

  const onLogin = () => {
    if (typeof window !== 'undefined') {
      window.location.assign('/login');
    }
  };

  return (
    <ErrorPresentation
      type={404}
      onHome={onHome}
      onLogin={onLogin}
    />
  );
}
