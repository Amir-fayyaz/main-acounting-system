import type { Repository } from 'typeorm';

jest.mock('@nestjs/typeorm', () => ({
  InjectRepository: (): jest.Mock => jest.fn(),
}));

import { TenantTypeOrmRepository } from './tenant-typeorm.repository';
import { TenantOrmEntity } from '../entities/tenant.orm-entity';
import { Currency, ShopName, TaxInfo, tenantId, Tenant } from '@modules/tenants/domain';

/** Minimal mock of the TypeORM repository public surface used by the adapter. */
const createMockRepository = () => {
  const save = jest.fn();
  const findOne = jest.fn();
  const count = jest.fn();
  const repository = {
    save,
    findOne,
    count,
  } as unknown as Repository<TenantOrmEntity>;

  return { repository, save, findOne, count };
};

describe('TenantTypeOrmRepository', () => {
  it('persists a tenant through the ORM entity mapping', async () => {
    const { repository, save } = createMockRepository();
    const adapter = new TenantTypeOrmRepository(repository);
    const tenant = Tenant.create({
      id: tenantId('tenant-1'),
      shopName: ShopName.of('Acme Mart'),
      taxInfo: TaxInfo.of({ legalName: 'Acme Trading LLC', nationalId: '1234567890' }),
      baseCurrency: Currency.of('IRR'),
    });

    await adapter.save(tenant);

    expect(save).toHaveBeenCalledTimes(1);
    const entity = save.mock.calls[0][0] as TenantOrmEntity;
    expect(entity).toBeInstanceOf(TenantOrmEntity);
    expect(entity.id).toBe('tenant-1');
    expect(entity.shopName).toBe('Acme Mart');
    expect(entity.inventoryValuationMethod).toBe('FIFO');
  });

  it('loads a tenant by id when one exists', async () => {
    const { repository, findOne } = createMockRepository();
    const entity = new TenantOrmEntity();
    entity.id = 'tenant-1';
    entity.shopName = 'Acme Mart';
    entity.legalName = 'Acme Trading LLC';
    entity.nationalId = '1234567890';
    entity.baseCurrency = 'IRR';
    entity.inventoryValuationMethod = 'FIFO';
    entity.subscriptionPlan = 'FREE';
    entity.status = 'ACTIVE';
    findOne.mockResolvedValue(entity);
    const adapter = new TenantTypeOrmRepository(repository);

    const tenant = await adapter.findById(tenantId('tenant-1'));

    expect(findOne).toHaveBeenCalledWith({ where: { id: 'tenant-1' } });
    expect(tenant).not.toBeNull();
    expect(tenant?.storeName.value).toBe('Acme Mart');
    expect(tenant?.valuation.value).toBe('FIFO');
  });

  it('returns null when no tenant matches the id', async () => {
    const { repository, findOne } = createMockRepository();
    findOne.mockResolvedValue(null);
    const adapter = new TenantTypeOrmRepository(repository);

    const tenant = await adapter.findById(tenantId('missing'));

    expect(tenant).toBeNull();
  });

  it('reports national ID existence via the count query', async () => {
    const { repository, count } = createMockRepository();
    count.mockResolvedValue(1);
    const adapter = new TenantTypeOrmRepository(repository);

    const exists = await adapter.existsByNationalId('1234567890');

    expect(count).toHaveBeenCalledWith({ where: { nationalId: '1234567890' } });
    expect(exists).toBe(true);
  });

  it('reports national ID non-existence when count is zero', async () => {
    const { repository, count } = createMockRepository();
    count.mockResolvedValue(0);
    const adapter = new TenantTypeOrmRepository(repository);

    const exists = await adapter.existsByNationalId('missing-id');

    expect(exists).toBe(false);
  });
});
