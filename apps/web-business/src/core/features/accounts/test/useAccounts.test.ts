import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Account, AccountStats } from '../assets/@types/account.types';
import { AccountApiError } from '../lib/accounts-api.errors';
import { useAccounts } from '../hook/useAccounts';

const api = vi.hoisted(() => ({
  list: vi.fn(),
  stats: vi.fn(),
}));

vi.mock('../lib/accounts-api', () => ({ accountsApi: api }));

const account: Account = {
  id: 'account-1001',
  revision: 1,
  title: 'حساب جاری ملی دفتر مرکزی',
  type: 'bank',
  bank: 'ملی',
  iban: 'IR000001000000000000000000',
  branch: 'دفتر مرکزی',
  balance: { amount: '125000000.00', currency: 'IRR' },
  status: 'active',
};

const response = {
  data: [account],
  meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
};

const stats: AccountStats = {
  bankBalance: { amount: '125000000.00', currency: 'IRR' },
  cashBalance: { amount: '0.00', currency: 'IRR' },
  total: 1,
};

beforeEach(() => {
  api.list.mockReset();
  api.stats.mockReset();
  api.list.mockResolvedValue(response);
  api.stats.mockResolvedValue(stats);
});

describe('useAccounts', () => {
  it('loads the list and stats with the current URL params', async () => {
    const { result } = renderHook(() =>
      useAccounts({ page: 2, limit: 10, search: 'ملی', type: 'bank' }),
    );

    expect(result.current.state.status).toBe('loading');

    await waitFor(() => {
      expect(result.current.state.status).toBe('success');
    });

    expect(api.list).toHaveBeenCalledWith({
      page: 2,
      limit: 10,
      search: 'ملی',
      type: 'bank',
    });
    expect(api.stats).toHaveBeenCalledWith({ search: 'ملی', type: 'bank' });

    if (result.current.state.status === 'success') {
      expect(result.current.state.response.data).toEqual([account]);
      expect(result.current.state.stats).toEqual(stats);
    }
  });

  it('omits empty filters from the API query', async () => {
    renderHook(() => useAccounts({ page: 1, limit: 20, search: '' }));

    await waitFor(() => {
      expect(api.list).toHaveBeenCalled();
    });

    expect(api.list).toHaveBeenCalledWith({ page: 1, limit: 20 });
    expect(api.stats).toHaveBeenCalledWith({});
  });

  it('refetches when refresh is called', async () => {
    const { result } = renderHook(() => useAccounts({ page: 1, limit: 20 }));

    await waitFor(() => {
      expect(api.list).toHaveBeenCalledTimes(1);
    });

    act(() => {
      result.current.refresh();
    });

    await waitFor(() => {
      expect(api.list).toHaveBeenCalledTimes(2);
    });
  });

  it('refetches when the page changes', async () => {
    const { rerender } = renderHook((params: { page: number }) => useAccounts(params), {
      initialProps: { page: 1 },
    });

    await waitFor(() => {
      expect(api.list).toHaveBeenLastCalledWith({ page: 1, limit: 20 });
    });

    rerender({ page: 2 });

    await waitFor(() => {
      expect(api.list).toHaveBeenLastCalledWith({ page: 2, limit: 20 });
    });
  });

  it('exposes the API error message to the table', async () => {
    api.list.mockRejectedValue(
      new AccountApiError({ code: 'UNKNOWN', status: 500, message: 'خطای شبیه‌سازی‌شده' }),
    );

    const { result } = renderHook(() => useAccounts({ page: 1, limit: 20 }));

    await waitFor(() => {
      expect(result.current.state.status).toBe('error');
    });

    if (result.current.state.status === 'error') {
      expect(result.current.state.message).toBe('خطای شبیه‌سازی‌شده');
    }
  });
});
