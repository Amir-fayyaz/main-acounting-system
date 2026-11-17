import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { AccountingPanelLayout } from '@/core/features/panel/components/block/layout/AccountingPanelLayout';
import { getSessionAction } from '@repo/web/session/storage';
import './panel.css';

export const metadata: Metadata = {
  title: { default: 'پنل کسب‌وکار | تراز', template: '%s | تراز' },
  robots: { index: false, follow: false },
};

export default async function PanelRouteLayout({ children }: { children: ReactNode }) {
  const sessionResult = await getSessionAction();

  if (!sessionResult.ok) {
    const loginBaseUrl = process.env.NEXT_PUBLIC_FRONTEND_URL || 'http://localhost:3001';
    redirect(`${loginBaseUrl}/login?next=${encodeURIComponent('/business')}`);
  }

  return (
    <div className="panel-preview">
      <AccountingPanelLayout userPrincipal={sessionResult.session.principal}>
        {children}
      </AccountingPanelLayout>
    </div>
  );
}
