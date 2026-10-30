import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { AccountingPanelLayout } from '@/core/features/panel/components/block/layout/AccountingPanelLayout';
import './panel.css';

export const metadata: Metadata = {
  title: { default: 'پنل مدیریت | تراز', template: '%s | تراز' },
  robots: { index: false, follow: false },
};

export default function PanelRouteLayout({ children }: { children: ReactNode }) {
  return (
    <div className="panel-preview">
      <AccountingPanelLayout>{children}</AccountingPanelLayout>
    </div>
  );
}
