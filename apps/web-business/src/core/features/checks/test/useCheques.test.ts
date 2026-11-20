import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Cheque, ChequeStats } from '../assets/@types/cheque.types';
import { ChequeApiError } from '../lib/checks-api.errors';
import { useCheques } from '../hook/useCheques';

const api = vi.hoisted(() => ({
  list: vi.fn(),
  stats: vi.fn(),
}));

vi.mock('../lib/checks-api', () => ({ checksApi: api }));

const cheque: Cheque = {
  id: 'cheque-1001',
  revision: 1,
  number: '100000',
  sayadId: '1200000000000000',
  direction: 'received',
  counterparty: 'شرکت آرمان تجارت',
  bank: 'ملی',
  amount: { amount: '125000000.00', currency: 'IRR' },
  registeredDate: '1405/07/27',
  dueDate: '1405/08/27',
  status: 'pending',
};

const response = {
  data: [cheque],
  meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
};

const stats: ChequeStats = { total: 1, received: 1, issued: 0, overdue: 0 };

beforeEach(() => {
  api.list.mockReset();
  api.stats.mockReset();
  api.list.mockResolvedValue(response);
  api.stats.mockResolvedValue(stats);
});

describe('useCheques', () => {
  it('loads the list and stats with the current URL params', async () => {
    const { result } = renderHook(() =>
      useCheques({
        page: 2,
        limit: 10,
        search: 'آرمان',
        status: 'pending',
        direction: 'received',
      }),
    );

    expect(result.current.state.status).toBe('loading');

    await waitFor(() => {
      expect(result.current.state.status).toBe('success');
    });

    expect(api.list).toHaveBeenCalledWith({
      page: 2,
      limit: 10,
      search: 'آرمان',
      status: 'pending',
      direction: 'received',
    });
    expect(api.stats).toHaveBeenCalledWith({
      search: 'آرمان',
      status: 'pending',
      direction: 'received',
    });

    if (result.current.state.status === 'success') {
      expect(result.current.state.response.data).toEqual([cheque]);
      expect(result.current.state.stats).toEqual(stats);
    }
  });

  it('omits empty filters from the API query', async () => {
    renderHook(() => useCheques({ page: 1, limit: 20, search: '' }));

    await waitFor(() => {
      expect(api.list).toHaveBeenCalled();
    });

    expect(api.list).toHaveBeenCalledWith({ page: 1, limit: 20 });
    expect(api.stats).toHaveBeenCalledWith({});
  });

  it('refetches when refresh is called', async () => {
    const { result } = renderHook(() => useCheques({ page: 1, limit: 20 }));

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
    const { rerender } = renderHook((params: { page: number }) => useCheques(params), {
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
      new ChequeApiError({ code: 'UNKNOWN', status: 500, message: 'خطای شبیه‌سازی‌شده' }),
    );

    const { result } = renderHook(() => useCheques({ page: 1, limit: 20 }));

    await waitFor(() => {
      expect(result.current.state.status).toBe('error');
    });

    if (result.current.state.status === 'error') {
      expect(result.current.state.message).toBe('خطای شبیه‌سازی‌شده');
    }
  });
});
