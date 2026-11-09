import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { PosTerminal } from '../assets/@types/pos-terminal.types';
import { PosApiError } from '../lib/pos-api.errors';
import { usePosTerminals } from '../hook/usePosTerminals';

const api = vi.hoisted(() => ({
  list: vi.fn(),
}));

vi.mock('../lib/pos-api', () => ({ posApi: api }));

const terminal: PosTerminal = {
  id: 'pos-1001',
  revision: 1,
  title: 'POS دفتر مرکزی',
  terminalNumber: '10000000',
  merchantNumber: '1000000000',
  bank: 'ملی',
  feePercent: '0.70',
  settlementIban: 'IR000001000000000000000000',
  activatedOn: '1404/01/15',
  status: 'active',
};

const response = {
  data: [terminal],
  meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
};

beforeEach(() => {
  api.list.mockReset();
  api.list.mockResolvedValue(response);
});

describe('usePosTerminals', () => {
  it('loads the list with the current URL params', async () => {
    const { result } = renderHook(() =>
      usePosTerminals({ page: 2, limit: 10, search: 'ونک', status: 'active' }),
    );

    expect(result.current.state.status).toBe('loading');

    await waitFor(() => {
      expect(result.current.state.status).toBe('success');
    });

    expect(api.list).toHaveBeenCalledWith({
      page: 2,
      limit: 10,
      search: 'ونک',
      status: 'active',
    });

    if (result.current.state.status === 'success') {
      expect(result.current.state.response.data).toEqual([terminal]);
    }
  });

  it('omits empty filters from the API query', async () => {
    renderHook(() => usePosTerminals({ page: 1, limit: 20, search: '' }));

    await waitFor(() => {
      expect(api.list).toHaveBeenCalled();
    });

    expect(api.list).toHaveBeenCalledWith({ page: 1, limit: 20 });
  });

  it('refetches when refresh is called', async () => {
    const { result } = renderHook(() => usePosTerminals({ page: 1, limit: 20 }));

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
    const { rerender } = renderHook((params: { page: number }) => usePosTerminals(params), {
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
      new PosApiError({ code: 'UNKNOWN', status: 500, message: 'خطای شبیه‌سازی‌شده' }),
    );

    const { result } = renderHook(() => usePosTerminals({ page: 1, limit: 20 }));

    await waitFor(() => {
      expect(result.current.state.status).toBe('error');
    });

    if (result.current.state.status === 'error') {
      expect(result.current.state.message).toBe('خطای شبیه‌سازی‌شده');
    }
  });
});
