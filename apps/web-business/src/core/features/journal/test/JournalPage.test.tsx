import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { JournalPage } from '../components/block/JournalPage';
import { resetJournalStore } from '../lib/journal-api';

const nav = vi.hoisted(() => ({
  pathname: '/journal',
  search: '',
  replace: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  usePathname: () => nav.pathname,
  useRouter: () => ({ replace: nav.replace }),
  useSearchParams: () => new URLSearchParams(nav.search),
}));

beforeEach(() => {
  resetJournalStore();
  nav.search = '';
  nav.replace.mockClear();
});

describe('JournalPage', () => {
  it('renders page header, actions, and stats', async () => {
    render(<JournalPage />);

    expect(screen.getByRole('heading', { level: 1, name: 'دفتر روزنامه' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /ثبت سند مرکب/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /چاپ/ })).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('تعداد اسناد')).toBeInTheDocument();
      expect(screen.getByText('جمع مبالغ')).toBeInTheDocument();
      expect(screen.getAllByText('پیش‌نویس').length).toBeGreaterThan(0);
    });
  });

  it('renders data table with columns and rows', async () => {
    render(<JournalPage />);

    await waitFor(() => {
      expect(screen.getByRole('table', { name: 'دفتر روزنامه' })).toBeInTheDocument();
    });

    expect(screen.getByRole('columnheader', { name: 'شماره سند' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'تاریخ' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'شرح' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'مبلغ (ریال)' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'وضعیت' })).toBeInTheDocument();
  });
});
