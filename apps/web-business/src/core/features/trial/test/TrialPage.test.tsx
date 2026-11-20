import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { TrialPage } from '../components/block/TrialPage';
import { resetTrialStore } from '../lib/trial-api';

const nav = vi.hoisted(() => ({
  search: '',
  pathname: '/trial',
  replace: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(nav.search),
  usePathname: () => nav.pathname,
  useRouter: () => ({ replace: nav.replace }),
}));

beforeEach(() => {
  resetTrialStore();
  nav.search = '';
  nav.replace.mockClear();
});

describe('TrialPage', () => {
  it('renders page header, print action, and KPIs', async () => {
    render(<TrialPage />);

    expect(screen.getByRole('heading', { level: 1, name: 'تراز آزمایشی' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /چاپ/ })).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('جمع مانده بدهکار')).toBeInTheDocument();
      expect(screen.getByText('جمع مانده بستانکار')).toBeInTheDocument();
      expect(screen.getByText('وضعیت تراز')).toBeInTheDocument();
      expect(screen.getByText('تراز است')).toBeInTheDocument();
    });
  });

  it('renders table columns and rows with footer totals', async () => {
    render(<TrialPage />);

    await waitFor(() => {
      expect(screen.getByRole('table', { name: 'تراز آزمایشی' })).toBeInTheDocument();
      expect(screen.getByText('صندوق')).toBeInTheDocument();
      expect(screen.getByText('بانک ملت')).toBeInTheDocument();
    });

    expect(screen.getByRole('columnheader', { name: 'کد' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'نام حساب' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'مانده بدهکار (ریال)' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'مانده بستانکار (ریال)' })).toBeInTheDocument();

    expect(screen.getByText('جمع کل')).toBeInTheDocument();
  });
});
