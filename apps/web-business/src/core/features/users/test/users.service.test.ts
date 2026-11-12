import { describe, expect, it } from 'vitest';

import { createUser, listAllUsers, listUsers } from '../lib/users.service';

describe('users service', () => {
  it('lists seeded users and supports role/search filtering', async () => {
    const all = await listAllUsers();
    expect(all.length).toBeGreaterThanOrEqual(6);

    const managers = await listAllUsers({ role: 'مدیر مالی' });
    expect(managers.every((u) => u.role === 'مدیر مالی')).toBe(true);

    const searched = await listAllUsers({ search: 'user2@example.com' });
    expect(searched.some((u) => u.email === 'user2@example.com')).toBe(true);
  });

  it('paginates results', async () => {
    const page = await listUsers({ page: 1, limit: 2 });
    expect(page.data).toHaveLength(2);
    expect(page.meta.limit).toBe(2);
    expect(page.meta.total).toBeGreaterThanOrEqual(6);
  });

  it('creates a user and rejects duplicate email', async () => {
    const created = await createUser({
      name: 'کاربر تست',
      email: 'new-user-test@example.com',
      role: 'حسابدار',
    });
    expect(created.name).toBe('کاربر تست');
    const all = await listAllUsers({ search: 'new-user-test@example.com' });
    expect(all.length).toBe(1);

    await expect(
      createUser({ name: 'تکراری', email: 'new-user-test@example.com', role: 'حسابدار' }),
    ).rejects.toThrow();
  });
});
