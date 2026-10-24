import { describe, expect, it } from 'vitest';

/** The outcome an adapter returns after translating its HTTP/application result. */
export type TenantIsolationOutcome<T> =
  | { readonly allowed: true; readonly value: T }
  | { readonly allowed: false; readonly reason?: string };

/** An invocation as seen by the module under test. */
export interface TenantIsolationCall<TActor> {
  readonly actor: TActor;
  /** The route's tenant claim; omitted to model an unscoped invocation. */
  readonly routeTenantId?: string;
  /** A deliberately untrusted header, when the transport supports one. */
  readonly headerTenantId?: string;
}

export interface TenantIsolationParty<TActor, TRecord> {
  readonly id: string;
  readonly actor: TActor;
  readonly record: TRecord;
}

/** A clean, two-company fixture. Each test gets a fresh one. */
export interface TenantIsolationFixture<TActor, TRecord> {
  readonly tenantA: TenantIsolationParty<TActor, TRecord>;
  readonly tenantB: TenantIsolationParty<TActor, TRecord>;
}

/**
 * Register an entity with this contract to get the common cross-tenant checks.
 * Adapters translate their own HTTP/domain error shape into `allowed: false`;
 * unexpected errors should be rethrown so the test fails rather than hiding a bug.
 *
 * A module only supplies operations it actually exposes. For example, the
 * Tenant module is the root company registry, so its own records have no
 * `tenant_id` column and it intentionally does not register list/search/delete
 * or tenant-owned create checks. Tenant-owned resource modules normally register
 * all of those operations.
 */
export interface TenantIsolationContract<TActor, TRecord> {
  readonly name: string;
  readonly createFixture: () => Promise<TenantIsolationFixture<TActor, TRecord>>;
  readonly dispose?: (fixture: TenantIsolationFixture<TActor, TRecord>) => Promise<void>;
  readonly idOf: (record: TRecord) => string;
  /** For a root tenant record, this is its own id; for tenant-owned rows, read tenantId. */
  readonly tenantIdOf: (record: TRecord) => string;
  /** Set false only for root resources where route id and record id are the same claim. */
  readonly supportsSwappedIdentifiers?: boolean;
  /** Reads the persisted state through a trusted test-only inspection path. */
  readonly snapshot: (
    fixture: TenantIsolationFixture<TActor, TRecord>,
    record: TRecord,
  ) => Promise<TRecord | undefined>;
  readonly readById: (
    fixture: TenantIsolationFixture<TActor, TRecord>,
    call: TenantIsolationCall<TActor>,
    recordId: string,
  ) => Promise<TenantIsolationOutcome<TRecord>>;
  readonly list?: (
    fixture: TenantIsolationFixture<TActor, TRecord>,
    call: TenantIsolationCall<TActor>,
  ) => Promise<TenantIsolationOutcome<readonly TRecord[]>>;
  /** Search should use a value that uniquely identifies the foreign fixture record. */
  readonly searchFor?: (
    fixture: TenantIsolationFixture<TActor, TRecord>,
    call: TenantIsolationCall<TActor>,
    foreignRecord: TRecord,
  ) => Promise<TenantIsolationOutcome<readonly TRecord[]>>;
  /** Create with the untrusted tenant id supplied as input; the caller's tenant must win. */
  readonly createWithTenantId?: (
    fixture: TenantIsolationFixture<TActor, TRecord>,
    call: TenantIsolationCall<TActor>,
    untrustedTenantId: string,
  ) => Promise<TenantIsolationOutcome<TRecord>>;
  readonly updateById?: (
    fixture: TenantIsolationFixture<TActor, TRecord>,
    call: TenantIsolationCall<TActor>,
    recordId: string,
    foreignRecord: TRecord,
  ) => Promise<TenantIsolationOutcome<unknown>>;
  readonly deleteById?: (
    fixture: TenantIsolationFixture<TActor, TRecord>,
    call: TenantIsolationCall<TActor>,
    recordId: string,
  ) => Promise<TenantIsolationOutcome<unknown>>;
  /** Actual HTTP adapter hook for an untrusted x-tenant-id (or equivalent) header. */
  readonly withTamperedHeader?: (
    fixture: TenantIsolationFixture<TActor, TRecord>,
    call: TenantIsolationCall<TActor>,
    recordId: string,
  ) => Promise<TenantIsolationOutcome<unknown>>;
}

function requireValue<T>(outcome: TenantIsolationOutcome<T>, description: string): T {
  expect(outcome.allowed, description).toBe(true);
  if (!outcome.allowed) {
    throw new Error(`${description}: the operation was refused`);
  }
  return outcome.value;
}

function expectDenied<T>(outcome: TenantIsolationOutcome<T>, description: string): void {
  expect(outcome.allowed, description).toBe(false);
}

/**
 * Adds reusable tenant-isolation tests for one entity/module.
 *
 * Keep the module-specific adapter thin: establish a scope from the trusted
 * fixture principal, invoke the real use case/route, then normalize its result.
 * The suite deliberately creates fresh fixtures per case so an accepted write
 * in one test can never influence a later assertion.
 */
export function registerTenantIsolationSuite<TActor, TRecord>(
  contract: TenantIsolationContract<TActor, TRecord>,
): void {
  describe(`${contract.name} — two-company isolation contract`, () => {
    async function withFixture(
      work: (fixture: TenantIsolationFixture<TActor, TRecord>) => Promise<void>,
    ) {
      const fixture = await contract.createFixture();
      try {
        await work(fixture);
      } finally {
        await contract.dispose?.(fixture);
      }
    }

    const callerA = (
      fixture: TenantIsolationFixture<TActor, TRecord>,
    ): TenantIsolationCall<TActor> => ({
      actor: fixture.tenantA.actor,
      routeTenantId: fixture.tenantA.id,
    });

    it('does not read a record by a foreign id', async () =>
      withFixture(async (fixture) => {
        expectDenied(
          await contract.readById(fixture, callerA(fixture), contract.idOf(fixture.tenantB.record)),
          'tenant A must not read tenant B by id',
        );
      }),
    );

    if (contract.supportsSwappedIdentifiers !== false) {
      it('refuses swapped tenant/record identifiers', async () =>
        withFixture(async (fixture) => {
          expectDenied(
            await contract.readById(
              fixture,
              { actor: fixture.tenantA.actor, routeTenantId: fixture.tenantB.id },
              contract.idOf(fixture.tenantA.record),
            ),
            'tenant A must not use its record id through tenant B route identity',
          );
        }),
      );
    }

    it('fails closed when no tenant scope is supplied', async () =>
      withFixture(async (fixture) => {
        expectDenied(
          await contract.readById(
            fixture,
            { actor: fixture.tenantA.actor },
            contract.idOf(fixture.tenantA.record),
          ),
          'a tenant-scoped read without a tenant must be refused',
        );
      }),
    );

    it('keeps concurrent reads inside each caller tenant', async () =>
      withFixture(async (fixture) => {
        const [readA, readB] = await Promise.all([
          contract.readById(fixture, callerA(fixture), contract.idOf(fixture.tenantA.record)),
          contract.readById(
            fixture,
            { actor: fixture.tenantB.actor, routeTenantId: fixture.tenantB.id },
            contract.idOf(fixture.tenantB.record),
          ),
        ]);

        const recordA = requireValue(readA, 'tenant A must read its own record');
        const recordB = requireValue(readB, 'tenant B must read its own record');
        expect(contract.tenantIdOf(recordA)).toBe(fixture.tenantA.id);
        expect(contract.tenantIdOf(recordB)).toBe(fixture.tenantB.id);
      }),
    );

    if (contract.list !== undefined) {
      it('does not list records belonging to another tenant', async () =>
        withFixture(async (fixture) => {
          const rows = requireValue(
            await contract.list!(fixture, callerA(fixture)),
            'tenant A list should be available to tenant A',
          );
          expect(rows.every((row) => contract.tenantIdOf(row) === fixture.tenantA.id)).toBe(true);
          expect(
            rows.some((row) => contract.idOf(row) === contract.idOf(fixture.tenantA.record)),
          ).toBe(true);
          expect(
            rows.some((row) => contract.idOf(row) === contract.idOf(fixture.tenantB.record)),
          ).toBe(false);
        }),
      );
    }

    if (contract.searchFor !== undefined) {
      it('does not find a foreign record through search', async () =>
        withFixture(async (fixture) => {
          const rows = requireValue(
            await contract.searchFor!(fixture, callerA(fixture), fixture.tenantB.record),
            'tenant A search should be available to tenant A',
          );
          expect(
            rows.some((row) => contract.idOf(row) === contract.idOf(fixture.tenantB.record)),
          ).toBe(false);
          expect(rows.every((row) => contract.tenantIdOf(row) === fixture.tenantA.id)).toBe(true);
        }),
      );
    }

    if (contract.createWithTenantId !== undefined) {
      it(
        'stores a created record under the caller tenant despite a foreign tenant id in input',
        async () =>
          withFixture(async (fixture) => {
            const created = requireValue(
              await contract.createWithTenantId!(fixture, callerA(fixture), fixture.tenantB.id),
              'tenant A create should succeed without adopting the supplied tenant B id',
            );
            const persisted = await contract.snapshot(fixture, created);
            expect(persisted).toBeDefined();
            expect(contract.idOf(persisted!)).toBe(contract.idOf(created));
            expect(contract.tenantIdOf(persisted!)).toBe(fixture.tenantA.id);
          }),
      );
    }

    if (contract.updateById !== undefined) {
      it('does not update a foreign record', async () =>
        withFixture(async (fixture) => {
          const before = await contract.snapshot(fixture, fixture.tenantB.record);
          expect(before).toBeDefined();
          expectDenied(
            await contract.updateById!(
              fixture,
              callerA(fixture),
              contract.idOf(fixture.tenantB.record),
              fixture.tenantB.record,
            ),
            'tenant A must not update tenant B',
          );
          expect(await contract.snapshot(fixture, fixture.tenantB.record)).toEqual(before);
        }),
      );
    }

    if (contract.deleteById !== undefined) {
      it('does not delete a foreign record', async () =>
        withFixture(async (fixture) => {
          const before = await contract.snapshot(fixture, fixture.tenantB.record);
          expect(before).toBeDefined();
          expectDenied(
            await contract.deleteById!(
              fixture,
              callerA(fixture),
              contract.idOf(fixture.tenantB.record),
            ),
            'tenant A must not delete tenant B',
          );
          expect(await contract.snapshot(fixture, fixture.tenantB.record)).toEqual(before);
        }),
      );
    }

    if (contract.withTamperedHeader !== undefined) {
      it('does not let a tampered tenant header change the target tenant', async () =>
        withFixture(async (fixture) => {
          expectDenied(
            await contract.withTamperedHeader!(
              fixture,
              { ...callerA(fixture), headerTenantId: fixture.tenantB.id },
              contract.idOf(fixture.tenantA.record),
            ),
            'tenant A request with a tenant B header must be refused',
          );
        }),
      );
    }
  });
}
