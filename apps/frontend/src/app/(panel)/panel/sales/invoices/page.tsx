import type { Metadata } from 'next';
import { InvoicesView } from '@/core/features/panel/components/block/invoices/InvoicesView';

export const metadata: Metadata = { title: 'فاکتورهای فروش' };

export default function PanelInvoicesPage() {
  return <InvoicesView />;
}
