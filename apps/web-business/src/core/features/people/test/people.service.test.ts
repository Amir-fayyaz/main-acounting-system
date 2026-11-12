import { describe, expect, it } from 'vitest';

import { createPerson, listAllPeople, listPeople } from '../lib/people.service';

const SEEDED_TOTAL = 12;

describe('people service', () => {
  it('applies the shared defaults: page 1, limit 20, server meta', async () => {
    const { data, meta } = await listPeople();

    expect(meta).toEqual({ page: 1, limit: 20, total: SEEDED_TOTAL, totalPages: 1 });
    expect(data).toHaveLength(SEEDED_TOTAL);
  });

  it('clamps out-of-range pages and limits', async () => {
    const beyondLast = await listPeople({ page: 99 });
    expect(beyondLast.meta.page).toBe(beyondLast.meta.totalPages);

    const clamped = await listPeople({ limit: 500 });
    expect(clamped.meta.limit).toBe(100);
    expect(clamped.meta.totalPages).toBe(1);
  });

  it('filters by kind', async () => {
    const { data, meta } = await listPeople({ kind: 'مشتری' });

    expect(meta.total).toBe(4);
    expect(data.every((person) => person.kind === 'مشتری')).toBe(true);
  });

  it('filters by search term', async () => {
    const { data, meta } = await listPeople({ search: 'داروخانه مهر' });

    expect(meta.total).toBe(1);
    expect(data[0]?.name).toBe('داروخانه مهر');
  });

  it('combines search, kind and pagination', async () => {
    const { data } = await listPeople({ kind: 'تأمین‌کننده', limit: 2 });

    expect(data).toHaveLength(2);
    expect(data.every((person) => person.kind === 'تأمین‌کننده')).toBe(true);
    expect((await listAllPeople({ kind: 'تأمین‌کننده' })).length).toBe(4);
  });

  it('creates a person that the list then returns first', async () => {
    const created = await createPerson({
      name: 'شخص تست یکتا',
      kind: 'هر دو',
      phone: '۰۹۱۲۰۰۰۰۰۰۰',
    });

    expect(created.id).toBe('person-0013');
    expect(created.recv).toBe('0.00');
    expect(created.pay).toBe('0.00');

    const { data, meta } = await listPeople();
    expect(meta.total).toBe(SEEDED_TOTAL + 1);
    expect(data[0]?.name).toBe('شخص تست یکتا');
  });

  it('rejects a duplicate person name', async () => {
    await expect(
      createPerson({ name: 'شخص تست یکتا', kind: 'مشتری', phone: '' }),
    ).rejects.toThrow('شخصی با این نام قبلاً ثبت شده است.');
  });
});
