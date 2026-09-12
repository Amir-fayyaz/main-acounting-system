import { Column, CreateDateColumn, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

/**
 * TypeORM persistence mapping for the Tenant aggregate (table `tenants`).
 * Column names are snake_case in PostgreSQL; the mapper translates between
 * this entity and the domain aggregate.
 */
@Entity('tenants')
export class TenantOrmEntity {
  @PrimaryColumn('uuid', { name: 'id' })
  id!: string;

  @Column('varchar', { name: 'shop_name', length: 100, unique: true })
  shopName!: string;

  @Column('varchar', { name: 'legal_name', length: 100 })
  legalName!: string;

  @Column('varchar', { name: 'national_id', length: 10 })
  nationalId!: string;

  @Column('varchar', { name: 'base_currency', length: 3, default: 'IRR' })
  baseCurrency!: string;

  @Column('varchar', { name: 'inventory_valuation_method', length: 10, default: 'FIFO' })
  inventoryValuationMethod!: string;

  @Column('varchar', { name: 'subscription_plan', length: 20, default: 'FREE' })
  subscriptionPlan!: string;

  @Column('varchar', { name: 'status', length: 20, default: 'ACTIVE' })
  status!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt!: Date;
}
