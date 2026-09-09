import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Creates the `tenants` table (case-insensitive column naming per TypeORM
 * convention, matching TenantOrmEntity). Unique constraint on shop_name and
 * defaults for inventory_valuation_method (FIFO), subscription_plan (FREE)
 * and status (ACTIVE).
 */
export class CreateTenantsTable1700000000000 implements MigrationInterface {
  name = 'CreateTenantsTable1700000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "tenants" (
        "id" uuid NOT NULL,
        "shop_name" character varying(100) NOT NULL,
        "inventory_valuation_method" character varying(10) NOT NULL DEFAULT 'FIFO',
        "subscription_plan" character varying(20) NOT NULL DEFAULT 'FREE',
        "status" character varying(20) NOT NULL DEFAULT 'ACTIVE',
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_tenants_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_tenants_shop_name" UNIQUE ("shop_name")
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "tenants"`);
  }
}
