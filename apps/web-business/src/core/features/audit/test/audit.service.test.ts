import { describe, expect, it } from 'vitest';

import { listAudit } from '../lib/audit.service';

const SEEDED_TOTAL = 40;

describe('audit service', () => {
  it('applies the shared defaults: page 1, limit 20, server meta', async () => {
    const { data, meta } = await listAudit();

    expect(meta).toEqual({ page: 1, limit: 20, total: SEEDED_TOTAL, totalPages: 2 });
    expect(data).toHaveLength(20);
  });

  it('clamps out-of-range pages and limits', async () => {
    const beyondLast = await listAudit({ page: 99 });
    expect(beyondLast.meta.page).toBe(beyondLast.meta.totalPages);

    const clamped = await listAudit({ limit: 500 });
    expect(clamped.meta.limit).toBe(100);
    expect(clamped.meta.totalPages).toBe(1);
  });

  it('filters by outcome', async () => {
    const { data, meta } = await listAudit({ outcome: 'ناموفق', limit: 100 });

    expect(meta.total).toBe(10);
    expect(data.every((event) => event.out === 'ناموفق')).toBe(true);
  });

  it('filters by search term across action, user and target', async () => {
    const { data, meta } = await listAudit({ search: 'invoice.created' });

    expect(meta.total).toBeGreaterThan(0);
    expect(data.every((event) => event.action === 'invoice.created')).toBe(true);
  });
});
